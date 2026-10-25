#!/usr/bin/env python3
"""
Ethereal Cafe - High-Performance Python Analytics Engine
Performs live data aggregation, statistical analysis, and forecasting on Supabase tables.
"""

import sys
import json
import urllib.request
import urllib.error
from datetime import datetime
import math
import statistics

SUPABASE_URL = "https://hvtkxwzxjuoeewalptmq.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dGt4d3p4anVvZWV3YWxwdG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjE4NTMsImV4cCI6MjEwNTgzNzg1M30.DVn4CeI1MIO4lH6qfEMYKZd8JkpRb5bHT0pNOKnqp7A"

def fetch_table(table_name, select="*"):
    url = f"{SUPABASE_URL}/rest/v1/{table_name}?select={select}"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Range": "0-1999"
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        sys.stderr.write(f"Error fetching {table_name}: {e}\n")
        return []

def analyze_hourly_heatmap():
    sessions = fetch_table("sessions", "session_id,session_start,session_end,price,pc_id")
    hourly_counts = {h: 0 for h in range(24)}
    hourly_revenue = {h: 0.0 for h in range(24)}
    durations_minutes = []

    for s in sessions:
        start_str = s.get("session_start")
        end_str = s.get("session_end")
        price = float(s.get("price") or 0.0)

        if start_str:
            try:
                # Format: 2026-01-16T06:25:24.985378 or similar ISO
                dt = datetime.fromisoformat(start_str.split(".")[0])
                h = dt.hour
                hourly_counts[h] += 1
                hourly_revenue[h] += price

                if end_str:
                    dt_end = datetime.fromisoformat(end_str.split(".")[0])
                    dur = (dt_end - dt).total_seconds() / 60.0
                    if 0 < dur <= 1440:
                        durations_minutes.append(dur)
            except Exception:
                continue

    avg_duration = statistics.mean(durations_minutes) if durations_minutes else 0.0
    median_duration = statistics.median(durations_minutes) if durations_minutes else 0.0
    stdev_duration = statistics.stdev(durations_minutes) if len(durations_minutes) > 1 else 0.0

    peak_hour = max(hourly_counts, key=hourly_counts.get) if hourly_counts else 0

    heatmap = [
        {
            "hour": f"{h:02d}:00",
            "sessions": hourly_counts[h],
            "revenue": round(hourly_revenue[h], 2)
        }
        for h in range(24)
    ]

    return {
        "engine": "Python 3.10 Statistics",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "total_sessions_analyzed": len(sessions),
        "peak_hour": f"{peak_hour:02d}:00",
        "peak_session_count": hourly_counts[peak_hour],
        "avg_duration_minutes": round(avg_duration, 1),
        "median_duration_minutes": round(median_duration, 1),
        "stdev_duration_minutes": round(stdev_duration, 1),
        "heatmap": heatmap
    }

def analyze_pc_efficiency():
    units = fetch_table("units", "pc_id,pc_number,type,status,area_location")
    sessions = fetch_table("sessions", "session_id,pc_id,price,session_start,session_end")

    pc_metrics = {}
    for u in units:
        pc_id = u["pc_id"]
        pc_metrics[pc_id] = {
            "pc_id": pc_id,
            "pc_number": u.get("pc_number", f"PC-{pc_id}"),
            "type": u.get("type", "Standard"),
            "status": u.get("status", "Available"),
            "area_location": u.get("area_location", "Main Floor"),
            "total_sessions": 0,
            "total_revenue": 0.0,
            "total_hours": 0.0
        }

    for s in sessions:
        pc_id = s.get("pc_id")
        if pc_id in pc_metrics:
            pc_metrics[pc_id]["total_sessions"] += 1
            pc_metrics[pc_id]["total_revenue"] += float(s.get("price") or 0.0)
            try:
                st = datetime.fromisoformat((s.get("session_start") or "").split(".")[0])
                en = datetime.fromisoformat((s.get("session_end") or "").split(".")[0])
                dur_hrs = max(0.0, (en - st).total_seconds() / 3600.0)
                pc_metrics[pc_id]["total_hours"] += dur_hrs
            except Exception:
                pass

    sorted_pcs = sorted(pc_metrics.values(), key=lambda x: x["total_revenue"], reverse=True)
    all_revenues = [p["total_revenue"] for p in sorted_pcs]

    avg_pc_revenue = statistics.mean(all_revenues) if all_revenues else 0.0
    highest_pc = sorted_pcs[0] if sorted_pcs else None

    # Calculate utilization score relative to top unit
    max_hrs = max([p["total_hours"] for p in sorted_pcs] or [1.0])
    for p in sorted_pcs:
        p["utilization_index"] = round((p["total_hours"] / max_hrs) * 100, 1) if max_hrs > 0 else 0
        p["total_revenue"] = round(p["total_revenue"], 2)
        p["total_hours"] = round(p["total_hours"], 1)

    return {
        "engine": "Python 3.10 Unit Analytics",
        "units_count": len(units),
        "avg_revenue_per_pc": round(avg_pc_revenue, 2),
        "top_pc": highest_pc["pc_number"] if highest_pc else "N/A",
        "top_pc_revenue": highest_pc["total_revenue"] if highest_pc else 0,
        "units": sorted_pcs
    }

def analyze_revenue_forecasting():
    earnings = fetch_table("earnings", "earnings_id,date,gross_income,expenses,net_profit")
    
    # Sort by date
    valid_entries = []
    for e in earnings:
        if e.get("date"):
            valid_entries.append({
                "date": e["date"],
                "gross": float(e.get("gross_income") or 0.0),
                "expenses": float(e.get("expenses") or 0.0),
                "profit": float(e.get("net_profit") or 0.0)
            })

    valid_entries.sort(key=lambda x: x["date"])

    if not valid_entries:
        return {"error": "No earnings records found"}

    # Aggregate by date
    daily = {}
    for entry in valid_entries:
        d = entry["date"]
        if d not in daily:
            daily[d] = {"gross": 0.0, "expenses": 0.0, "profit": 0.0}
        daily[d]["gross"] += entry["gross"]
        daily[d]["expenses"] += entry["expenses"]
        daily[d]["profit"] += entry["profit"]

    chronological = [{"date": k, **v} for k, v in sorted(daily.items())]

    # Linear regression on gross income
    n = len(chronological)
    x_vals = list(range(n))
    y_gross = [row["gross"] for row in chronological]
    y_profit = [row["profit"] for row in chronological]

    if n >= 2:
        x_mean = statistics.mean(x_vals)
        y_gross_mean = statistics.mean(y_gross)
        num = sum((x_vals[i] - x_mean) * (y_gross[i] - y_gross_mean) for i in range(n))
        den = sum((x_vals[i] - x_mean) ** 2 for i in range(n))
        slope = num / den if den != 0 else 0
        intercept = y_gross_mean - slope * x_mean

        # Forecast next 7 periods
        forecasts = []
        last_date = datetime.strptime(chronological[-1]["date"][:10], "%Y-%m-%d") if chronological else datetime.today()
        from datetime import timedelta
        for step in range(1, 8):
            f_x = n - 1 + step
            f_gross = max(0.0, intercept + slope * f_x)
            f_date = (last_date + timedelta(days=step)).strftime("%Y-%m-%d")
            forecasts.append({
                "date": f_date,
                "projected_gross": round(f_gross, 2),
                "projected_net_profit": round(f_gross * 0.65, 2)
            })
    else:
        slope = 0
        forecasts = []

    total_gross = sum(y_gross)
    total_profit = sum(y_profit)
    profit_margin = (total_profit / total_gross * 100) if total_gross > 0 else 0

    return {
        "engine": "Python 3.10 Linear Regression & Time-Series",
        "sample_points": n,
        "total_gross_income": round(total_gross, 2),
        "total_net_profit": round(total_profit, 2),
        "net_profit_margin_pct": round(profit_margin, 2),
        "revenue_growth_slope": round(slope, 3),
        "trend_direction": "Upward / Expansion" if slope > 0.05 else ("Stable" if slope >= -0.05 else "Downward"),
        "historical_series": chronological[-14:], # last 14 dates
        "forecast_next_7_days": forecasts
    }

def analyze_customer_rfm():
    customers = fetch_table("customers", "customer_id,first_name,last_name,membership")
    sessions = fetch_table("sessions", "session_id,customer_id,date,price")

    cust_map = {}
    for c in customers:
        cid = c["customer_id"]
        cust_map[cid] = {
            "customer_id": cid,
            "name": f"{c.get('first_name', '')} {c.get('last_name', '')}".strip(),
            "membership": c.get("membership", "Regular"),
            "sessions_count": 0,
            "total_spend": 0.0,
            "latest_visit": None
        }

    for s in sessions:
        cid = s.get("customer_id")
        if cid in cust_map:
            cust_map[cid]["sessions_count"] += 1
            cust_map[cid]["total_spend"] += float(s.get("price") or 0.0)
            d = s.get("date")
            if d:
                if not cust_map[cid]["latest_visit"] or d > cust_map[cid]["latest_visit"]:
                    cust_map[cid]["latest_visit"] = d

    # Segment customers
    rfm_list = list(cust_map.values())
    for c in rfm_list:
        c["total_spend"] = round(c["total_spend"], 2)
        if c["sessions_count"] >= 15 or c["total_spend"] >= 1200:
            c["segment"] = "VIP Champion"
        elif c["sessions_count"] >= 8:
            c["segment"] = "Loyal Gamer"
        elif c["sessions_count"] >= 3:
            c["segment"] = "Active Regular"
        else:
            c["segment"] = "New / Casual"

    rfm_list.sort(key=lambda x: x["total_spend"], reverse=True)

    segment_counts = {}
    for c in rfm_list:
        seg = c["segment"]
        segment_counts[seg] = segment_counts.get(seg, 0) + 1

    return {
        "engine": "Python 3.10 Customer Intelligence",
        "total_customers": len(customers),
        "segment_distribution": segment_counts,
        "top_10_customers": rfm_list[:10]
    }

def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "all"

    if action == "hourly":
        print(json.dumps(analyze_hourly_heatmap()))
    elif action == "units":
        print(json.dumps(analyze_pc_efficiency()))
    elif action == "forecast":
        print(json.dumps(analyze_revenue_forecasting()))
    elif action == "rfm":
        print(json.dumps(analyze_customer_rfm()))
    elif action == "all":
        result = {
            "hourly": analyze_hourly_heatmap(),
            "units": analyze_pc_efficiency(),
            "forecast": analyze_revenue_forecasting(),
            "rfm": analyze_customer_rfm()
        }
        print(json.dumps(result))
    else:
        print(json.dumps({"error": f"Unknown action {action}"}))

if __name__ == "__main__":
    main()
