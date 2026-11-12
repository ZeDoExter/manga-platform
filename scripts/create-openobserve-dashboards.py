import json
import urllib.request
import base64

AUTH = "root@example.com:Complexpass#123"
BASE = "https://obs.dootoon.store/api/default/dashboards"
BASIC = "Basic " + base64.b64encode(AUTH.encode()).decode()
HEADERS = {
    "Authorization": BASIC,
    "Content-Type": "application/json",
    "User-Agent": "curl/8.22.0"
}

FULL_CONFIG = {
    "show_legends": True, "legends_position": None, "decimals": 2,
    "line_thickness": 1.5, "top_results_others": False, "axis_border_show": False,
    "label_option": {"rotate": 0}, "show_symbol": False, "line_interpolation": "smooth",
    "legend_width": {"unit": "px"}, "base_map": {"type": "osm"},
    "map_type": {"type": "world"}, "map_view": {"zoom": 1, "lat": 0, "lng": 0},
    "map_symbol_style": {"size": "by Value", "size_by_value": {"min": 1, "max": 100}, "size_fixed": 2},
    "drilldown": [], "mark_line": [], "override_config": [], "connect_nulls": False,
    "no_value_replacement": "", "wrap_table_cells": False, "table_transpose": False,
    "table_dynamic_columns": False,
    "color": {"mode": "palette-classic-by-series", "fixedColor": ["#53ca53"], "seriesBy": "last"},
    "trellis": {"layout": None, "num_of_columns": 1},
}
QCONF = {"promql_legend": "", "layer_type": "scatter", "weight_fixed": 1, "limit": 0, "min": 0, "max": 100, "time_shift": []}


def fld(label, alias, column):
    return {"label": label, "alias": alias, "column": column, "color": None, "isDerived": False,
            "aggregationFunction": None, "treatAsNonTimeseries": True}


def panel(pid, title, chart, sql, xs, ys, brks, x, y, w, h, i):
    return {
        "id": pid, "type": chart, "title": title, "description": "",
        "queryType": "sql",
        "queries": [{
            "query": sql, "vrlFunctionQuery": "", "customQuery": False,
            "fields": {
                "stream": "manga_logs", "stream_type": "logs",
                "x": [fld(*f) for f in xs], "y": [fld(*f) for f in ys], "z": [],
                "breakdown": [fld(*f) for f in brks],
                "filter": {"filterType": "group", "logicalOperator": "AND", "conditions": []},
            },
            "config": dict(QCONF),
        }],
        "layout": {"x": x, "y": y, "w": w, "h": h, "i": i, "moved": False},
        "config": dict(FULL_CONFIG), "htmlContent": "", "markdownContent": "",
    }


DASHES = [
    ("DOOTOON - Service Health", [
        ("rps", "Requests surge together (all 9 services)", "line",
         'SELECT histogram(_timestamp) AS x, service, count(*) AS y FROM "manga_logs" GROUP BY x, service ORDER BY x',
         [("X", "x", "x")], [("Count", "y", "y")], [("Service", "service", "service")], 0, 0, 48, 9, 1),
        ("p95", "p95 latency stays under 300ms target", "line",
         'SELECT histogram(_timestamp) AS x, service, approx_percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS y FROM "manga_logs" GROUP BY x, service ORDER BY x',
         [("X", "x", "x")], [("P95", "y", "y")], [("Service", "service", "service")], 0, 9, 48, 9, 2),
        ("err", "Errors by service (expect near-zero)", "bar",
         'SELECT service, status, count(*) AS y FROM "manga_logs" WHERE status >= 400 GROUP BY service, status ORDER BY y DESC LIMIT 15',
         [("Service", "service", "service")], [("Count", "y", "y")], [], 0, 18, 24, 9, 3),
        ("slow", "Slowest requests carry trace_id for drill-down", "table",
         'SELECT trace_id, service, method, path, status, duration_ms FROM "manga_logs" ORDER BY duration_ms DESC LIMIT 10',
         [("Trace", "trace_id", "trace_id")], [("Ms", "duration_ms", "duration_ms")], [], 24, 18, 24, 9, 4),
    ]),
    ("DOOTOON - Money Path", [
        ("vol", "Top-ups vs purchases over time", "line",
         "SELECT histogram(_timestamp) AS x, path, count(*) AS y FROM \"manga_logs\" WHERE service = 'commerce' AND path NOT IN ('/healthz','/readyz') GROUP BY x, path ORDER BY x",
         [("X", "x", "x")], [("Count", "y", "y")], [("Path", "path", "path")], 0, 0, 48, 9, 1),
        ("lat", "Money endpoints stay fast (avg ms)", "bar",
         "SELECT path, avg(duration_ms) AS y FROM \"manga_logs\" WHERE service = 'commerce' AND path NOT IN ('/healthz','/readyz') GROUP BY path ORDER BY y DESC LIMIT 10",
         [("Path", "path", "path")], [("AvgMs", "y", "y")], [], 0, 9, 24, 9, 2),
        ("gate", "Read gate outcomes (200 read / 402 pay / 401 login)", "bar",
         "SELECT status, count(*) AS y FROM \"manga_logs\" WHERE service = 'reader' AND path NOT IN ('/healthz','/readyz') GROUP BY status ORDER BY y DESC",
         [("Status", "status", "status")], [("Count", "y", "y")], [], 24, 9, 24, 9, 3),
        ("audit", "Takedown + reversal trail (trace each refund)", "table",
         "SELECT _timestamp, trace_id, service, method, path, status, duration_ms FROM \"manga_logs\" WHERE path LIKE '%takedown%' OR path LIKE '%revers%' OR path LIKE '%refund%' ORDER BY _timestamp DESC LIMIT 20",
         [("Trace", "trace_id", "trace_id")], [("Ms", "duration_ms", "duration_ms")], [], 0, 18, 48, 9, 4),
    ]),
    ("DOOTOON - Demo Live", [
        ("now", "Requests right now by service", "line",
         'SELECT histogram(_timestamp) AS x, service, count(*) AS y FROM "manga_logs" GROUP BY x, service ORDER BY x',
         [("X", "x", "x")], [("Count", "y", "y")], [("Service", "service", "service")], 0, 0, 48, 9, 1),
        ("p95now", "p95 latency right now (target < 300ms)", "line",
         'SELECT histogram(_timestamp) AS x, service, approx_percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) AS y FROM "manga_logs" GROUP BY x, service ORDER BY x',
         [("X", "x", "x")], [("P95", "y", "y")], [("Service", "service", "service")], 0, 9, 48, 9, 2),
        ("errnow", "Errors right now (want: empty)", "table",
         'SELECT _timestamp, trace_id, service, method, path, status, duration_ms FROM "manga_logs" WHERE status >= 500 ORDER BY _timestamp DESC LIMIT 20',
         [("Trace", "trace_id", "trace_id")], [("Ms", "duration_ms", "duration_ms")], [], 0, 18, 48, 9, 3),
    ]),
]


def create_dashboards():
    # 1. Fetch current dashboards
    req = urllib.request.Request(BASE, headers=HEADERS)
    with urllib.request.urlopen(req) as resp:
        cur = json.loads(resp.read().decode()).get("dashboards", [])
    print(f"Existing dashboards: {len(cur)}")

    # Delete any stale ones
    for d in cur:
        did = d.get("dashboard_id")
        if did:
            del_req = urllib.request.Request(f"{BASE}/{did}?folder=default", headers=HEADERS, method="DELETE")
            try:
                with urllib.request.urlopen(del_req) as resp:
                    print(f"Deleted old {did}")
            except Exception as e:
                print(f"Failed deleting {did}: {e}")

    # Create new
    created = []
    for title, panels in DASHES:
        body = {
            "version": 5,
            "title": title,
            "description": "Auto-built for demo day.",
            "tabs": [{"tabId": "default", "name": "Default", "panels": [panel(*p) for p in panels]}]
        }
        post_req = urllib.request.Request(BASE, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
        with urllib.request.urlopen(post_req) as resp:
            data = json.loads(resp.read().decode())
            did = (data.get("v5") or {}).get("dashboardId")
            print(f"Created '{title}' -> {did}")
            created.append((title, did))

    # Verify
    verify_req = urllib.request.Request(BASE, headers=HEADERS)
    with urllib.request.urlopen(verify_req) as resp:
        final_list = json.loads(resp.read().decode()).get("dashboards", [])
        print(f"Final dashboard count: {len(final_list)}")
        for d in final_list:
            print(f"  - {d.get('title')} (ID: {d.get('dashboard_id')})")


if __name__ == "__main__":
    create_dashboards()
