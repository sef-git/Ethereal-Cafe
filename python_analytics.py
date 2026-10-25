#!/usr/bin/env python3
"""
Ethereal Cafe - Python Analytics Engine

Reads from Supabase (PostgREST), aggregates, and prints ONE JSON document to stdout.
Called by server.ts as:  python3 python_analytics.py <all|hourly|units|forecast|rfm>

Configuration comes from environment variables (see .env.example). No secrets live in this file.
"""
import json
import os
import re
import statistics
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
# Prefer the server-only service-role key (bypasses RLS, so RLS can stay locked down).
# Falls back to SUPABASE_KEY (e.g. anon key) if the matching RLS read policies exist.
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY", "")

PAGE_SIZE = 1000                                            # rows per request
MAX_ROWS = int(os.environ.get("ANALYTICS_MAX_ROWS", "100000"))  # per table safety cap
HTTP_TIMEOUT = int(os.environ.get("SUPABASE_HTTP_TIMEOUT", "15"))
# Hours to add to UTC timestamps before bucketing by hour (e.g. 8 for UTC+8).
UTC_OFFSET_HOURS = float(os.environ.get("CAFE_UTC_OFFSET_HOURS", "0"))

# Logical table -> real table name. Override via env, e.g. SUPABASE_TABLE_SESSIONS=fact_sessions
TABLES = {
    "sessions": os.environ.get("SUPABASE_TABLE_SESSIONS", "sessions"),
    "units": os.environ.get("SUPABASE_TABLE_UNITS", "units"),
    "earnings": os.environ.get("SUPABASE_TABLE_EARNINGS", "earnings"),
    "customers": os.environ.get("SUPABASE_TABLE_CUSTOMERS", "customers"),
}

# Logical column -> real column name. Edit the right-hand side if your schema differs
# (e.g. a star schema). Columns are aliased in the query, so the analysis code never changes.
COLUMNS = {
    "sessions": {
        "session_id": "session_id",
        "customer_id": "customer_id",
        "pc_id": "pc_id",
        "session_start": "session_start",
        "session_end": "session_end",
        "price": "price",
    },
    "units": {
        "pc_id": "pc_id",
        "pc_number": "pc_number",
        "type": "type",
        "status": "status",
        "area_location": "area_location",
    },
    "earnings": {
        "date": "date",
        "gross_income": "gross_income",
        "expenses": "expenses",
        "net_profit": "net_profit",
    },
    "customers": {
        "customer_id": "customer_id",
        "first_name": "first_name",
        "last_name": "last_name",
        "membership": "membership",
    },
}


class ConfigError(Exception):
    pass


class DataSourceError(Exception):
    pass


WARNINGS = []   # non-fatal notices (e.g. truncated tables) attached to the output
_ROWS = {}      # logical table -> rows; each table is downloaded at most once per run


def require_config():
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)")
    if missing:
        raise ConfigError("Missing environment variable(s): " + ", ".join(missing))


# ---------------------------------------------------------------------------
# Supabase access (paginated, fetched once per table)
# ---------------------------------------------------------------------------
def _select_clause(logical):
    parts = []
    for name, real in COLUMNS[logical].items():
        parts.append(name if name == real else f"{name}:{real}")
    return ",".join(parts)


def _get_page(url, start, end, label):
    req = urllib.request.Request(
        url,
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Range-Unit": "items",
            "Range": f"{start}-{end}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        # 416 = requested range starts past the last row -> no more data.
        if e.code == 416:
            return []
        raise DataSourceError(f"Supabase returned HTTP {e.code} for table '{label}'")
    except Exception as e:
        raise DataSourceError(f"Could not fetch table '{label}': {type(e).__name__}")


def load(logical):
    """Return all rows for a logical table (paginated), cached for this process."""
    if logical in _ROWS:
        return _ROWS[logical]

    real_table = TABLES[logical]
    base = f"{SUPABASE_URL}/rest/v1/{urllib.parse.quote(real_table)}"
    url = f"{base}?select={urllib.parse.quote(_select_clause(logical), safe=',:*')}"

    rows = []
    offset = 0
    while offset < MAX_ROWS:
        end = min(offset + PAGE_SIZE, MAX_ROWS) - 1
        page = _get_page(url, offset, end, real_table)
        rows.extend(page)
        expected = end - offset + 1
        if len(page) < expected:
            break
        offset += expected
    else:
        WARNINGS.append(
            f"Table '{real_table}' hit the {MAX_ROWS}-row cap; results may be incomplete. "
            "Raise ANALYTICS_MAX_ROWS or move aggregation into SQL views."
        )

    _ROWS[logical] = rows
    return rows


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_TS = re.compile(
    r"^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$"
)


def parse_ts(value):
    """Parse Supabase/Postgres timestamps into timezone-aware UTC datetimes."""
    if not value:
        return None
    m = _TS.match(str(value).strip())
    if not m:
        return None
    date_part, time_part, frac, tz = m.groups()
    try:
        dt = datetime.strptime(f"{date_part} {time_part or '00:00:00'}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None
    if frac:
        dt = dt.replace(microsecond=int((frac[1:] + "000000")[:6]))
    if tz and tz != "Z":
        digits = tz[1:].replace(":", "")
        offset = timedelta(hours=int(digits[:2]), minutes=int(digits[2:4] or 0))
        if tz[0] == "-":
            offset = -offset
        return (dt - offset).replace(tzinfo=timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


def local(dt):
    return dt + timedelta(hours=UTC_OFFSET_HOURS)


def num(value):
    try:
        return float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0


# ---------------------------------------------------------------------------
# Analyses
# ---------------------------------------------------------------------------
def analyze_hourly_heatmap():
    try:
        sessions = load("sessions")
        hourly_counts = {h: 0 for h in range(24)}
        hourly_revenue = {h: 0.0 for h in range(24)}
        durations = []

        for s in sessions:
            start = parse_ts(s.get("session_start"))
            if not start:
                continue
            h = local(start).hour
            hourly_counts[h] += 1
            hourly_revenue[h] += num(s.get("price"))

            end = parse_ts(s.get("session_end"))
            if end:
                minutes = (end - start).total_seconds() / 60.0
                if 0 < minutes <= 1440:
                    durations.append(minutes)

        peak_hour = max(hourly_counts, key=hourly_counts.get)
        return {
            "engine": "Python Statistics",
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "total_sessions_analyzed": len(sessions),
            "peak_hour": f"{peak_hour:02d}:00",
            "peak_session_count": hourly_counts[peak_hour],
            "avg_duration_minutes": round(statistics.mean(durations), 1) if durations else 0.0,
            "median_duration_minutes": round(statistics.median(durations), 1) if durations else 0.0,
            "stdev_duration_minutes": round(statistics.stdev(durations), 1) if len(durations) > 1 else 0.0,
            "heatmap": [
                {
                    "hour": f"{h:02d}:00",
                    "sessions": hourly_counts[h],
                    "revenue": round(hourly_revenue[h], 2),
                }
                for h in range(24)
            ],
        }
    except Exception as e:
        return {"error": f"Hourly heatmap analysis failed: {e}"}


def analyze_pc_efficiency():
    try:
        units = load("units")
        sessions = load("sessions")  # already cached -> no second download

        metrics = {}
        for u in units:
            pc_id = u.get("pc_id")
            metrics[pc_id] = {
                "pc_id": pc_id,
                "pc_number": u.get("pc_number") or f"PC-{pc_id}",
                "type": u.get("type") or "Standard",
                "status": u.get("status") or "Available",
                "area_location": u.get("area_location") or "Main Floor",
                "total_sessions": 0,
                "total_revenue": 0.0,
                "total_hours": 0.0,
            }

        for s in sessions:
            m = metrics.get(s.get("pc_id"))
            if m is None:
                continue
            m["total_sessions"] += 1
            m["total_revenue"] += num(s.get("price"))
            st, en = parse_ts(s.get("session_start")), parse_ts(s.get("session_end"))
            if st and en:
                m["total_hours"] += max(0.0, (en - st).total_seconds() / 3600.0)

        ranked = sorted(metrics.values(), key=lambda x: x["total_revenue"], reverse=True)
        max_hours = max([p["total_hours"] for p in ranked] or [0.0])
        for p in ranked:
            p["utilization_index"] = round(p["total_hours"] / max_hours * 100, 1) if max_hours > 0 else 0
            p["total_revenue"] = round(p["total_revenue"], 2)
            p["total_hours"] = round(p["total_hours"], 1)

        revenues = [p["total_revenue"] for p in ranked]
        top = ranked[0] if ranked else None
        return {
            "engine": "Python Unit Analytics",
            "units_count": len(units),
            "avg_revenue_per_pc": round(statistics.mean(revenues), 2) if revenues else 0.0,
            "top_pc": top["pc_number"] if top else "N/A",
            "top_pc_revenue": top["total_revenue"] if top else 0,
            "units": ranked,
        }
    except Exception as e:
        return {"error": f"PC efficiency analysis failed: {e}"}


def analyze_revenue_forecasting():
    try:
        earnings = load("earnings")

        daily = {}
        for row in earnings:
            if not row.get("date"):
                continue
            day = str(row["date"])[:10]
            d = daily.setdefault(day, {"gross": 0.0, "expenses": 0.0, "profit": 0.0})
            d["gross"] += num(row.get("gross_income"))
            d["expenses"] += num(row.get("expenses"))
            d["profit"] += num(row.get("net_profit"))

        if not daily:
            return {"error": "No earnings records found"}

        chronological = [{"date": k, **v} for k, v in sorted(daily.items())]
        n = len(chronological)
        y_gross = [r["gross"] for r in chronological]
        total_gross = sum(y_gross)
        total_profit = sum(r["profit"] for r in chronological)
        margin = (total_profit / total_gross) if total_gross > 0 else 0.0

        slope, forecasts = 0.0, []
        if n >= 2:
            x_vals = list(range(n))
            x_mean, y_mean = statistics.mean(x_vals), statistics.mean(y_gross)
            den = sum((x - x_mean) ** 2 for x in x_vals)
            slope = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_gross)) / den if den else 0.0
            intercept = y_mean - slope * x_mean
            last_date = datetime.strptime(chronological[-1]["date"], "%Y-%m-%d")
            for step in range(1, 8):
                projected = max(0.0, intercept + slope * (n - 1 + step))
                forecasts.append({
                    "date": (last_date + timedelta(days=step)).strftime("%Y-%m-%d"),
                    "projected_gross": round(projected, 2),
                    # Uses the cafe's own observed margin instead of a hardcoded 65%.
                    "projected_net_profit": round(projected * margin, 2),
                })

        return {
            "engine": "Python Linear Regression & Time-Series",
            "sample_points": n,
            "total_gross_income": round(total_gross, 2),
            "total_net_profit": round(total_profit, 2),
            "net_profit_margin_pct": round(margin * 100, 2),
            "revenue_growth_slope": round(slope, 3),
            "trend_direction": "Upward / Expansion" if slope > 0.05 else ("Stable" if slope >= -0.05 else "Downward"),
            "historical_series": [
                {**r, "gross": round(r["gross"], 2), "expenses": round(r["expenses"], 2), "profit": round(r["profit"], 2)}
                for r in chronological[-14:]
            ],
            "forecast_next_7_days": forecasts,
        }
    except Exception as e:
        return {"error": f"Revenue forecasting failed: {e}"}


def analyze_customer_rfm():
    try:
        customers = load("customers")
        sessions = load("sessions")  # cached

        book = {}
        for c in customers:
            cid = c.get("customer_id")
            book[cid] = {
                "customer_id": cid,
                "name": f"{c.get('first_name') or ''} {c.get('last_name') or ''}".strip(),
                "membership": c.get("membership") or "Regular",
                "sessions_count": 0,
                "total_spend": 0.0,
                "latest_visit": None,
            }

        for s in sessions:
            rec = book.get(s.get("customer_id"))
            if rec is None:
                continue
            rec["sessions_count"] += 1
            rec["total_spend"] += num(s.get("price"))
            dt = parse_ts(s.get("session_start"))
            if dt:
                day = local(dt).strftime("%Y-%m-%d")
                if not rec["latest_visit"] or day > rec["latest_visit"]:
                    rec["latest_visit"] = day

        rows = list(book.values())
        segments = {}
        for c in rows:
            c["total_spend"] = round(c["total_spend"], 2)
            if c["sessions_count"] >= 15 or c["total_spend"] >= 1200:
                c["segment"] = "VIP Champion"
            elif c["sessions_count"] >= 8:
                c["segment"] = "Loyal Gamer"
            elif c["sessions_count"] >= 3:
                c["segment"] = "Active Regular"
            else:
                c["segment"] = "New / Casual"
            segments[c["segment"]] = segments.get(c["segment"], 0) + 1

        rows.sort(key=lambda x: x["total_spend"], reverse=True)
        return {
            "engine": "Python Customer Intelligence",
            "total_customers": len(customers),
            "segment_distribution": segments,
            "top_10_customers": rows[:10],
        }
    except Exception as e:
        return {"error": f"Customer RFM analysis failed: {e}"}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
ACTIONS = {
    "hourly": analyze_hourly_heatmap,
    "units": analyze_pc_efficiency,
    "forecast": analyze_revenue_forecasting,
    "rfm": analyze_customer_rfm,
}


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "all"

    try:
        require_config()
    except ConfigError as e:
        sys.stderr.write(f"{e}\n")
        print(json.dumps({"error": "Analytics engine is not configured"}))
        return 1

    if action == "all":
        result = {name: fn() for name, fn in ACTIONS.items()}
    elif action in ACTIONS:
        result = ACTIONS[action]()
    else:
        sys.stderr.write(f"Unknown action: {action}\n")
        print(json.dumps({"error": "Unknown action"}))
        return 2

    if WARNINGS:
        result["warnings"] = WARNINGS
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
