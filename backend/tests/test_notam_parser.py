import pytest

from notam_parser import categorize_notam, process_notams


@pytest.mark.parametrize("text,expected", [
    ("RWY 05L/23R CLSD", "🚨 跑道關閉"),
    ("TWY A CLSD", "🚧 滑行道關閉"),
    ("TWY B LIGHTING U/S", "🚕 滑行道資訊"),
    ("VOR TPE U/S", "📡 導航設施"),
    ("CRANE ERECTED", "🏗️ 施工與障礙物"),
])
def test_basic_categories(text, expected):
    assert categorize_notam(text) == expected


# ---- 以下是「應該要對、目前可能錯」的行為；失敗 = 已確認的 bug ----

def test_bug_negation_not_clsd_is_not_closure():
    assert categorize_notam("RWY 05L NOT CLSD") != "🚨 跑道關閉"


def test_bug_ils_on_runway_is_navaid():
    assert categorize_notam("ILS RWY 05L U/S") == "📡 導航設施"


def test_bug_crane_near_runway_is_obstacle():
    assert categorize_notam("CRANE ERECTED 300FT RWY 23 APCH") == "🏗️ 施工與障礙物"


def test_bug_substring_false_positive_favorable():
    assert categorize_notam("FAVORABLE CONDITIONS") == "📝 一般資訊"


def test_bug_wip_on_taxiway_is_construction_or_twy():
    # 至少不應被歸為純「滑行道資訊」而漏掉施工資訊（需產品決策，這裡只記錄現況）
    assert categorize_notam("WIP ON TWY B") in ("🏗️ 施工與障礙物", "🚧 滑行道關閉")


def test_process_notams_empty_inputs():
    assert process_notams(None) == []
    assert process_notams({}) == []
    assert process_notams({"notamList": [{"icaoMessage": " ", "traditionalMessageFrom4thWord": ""}]}) == []


def test_process_notams_sorted_by_severity():
    out = process_notams({"notamList": [
        {"icaoMessage": "GENERAL TEXT"},
        {"icaoMessage": "RWY 05 CLSD"},
    ]})
    assert out[0]["category"] == "🚨 跑道關閉"


def test_bug_missing_dates_not_none():
    out = process_notams({"notamList": [{"icaoMessage": "RWY 05 CLSD", "startDate": None}]})
    assert out[0]["start_time"] not in (None, "None")
