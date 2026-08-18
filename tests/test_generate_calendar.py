import unittest
from datetime import date, datetime, timezone

from scripts.generate_calendar import (
    Event,
    event_from_item,
    fold_line,
    parse_date,
    render_calendar,
)


def item(start=None, end=None, repository="zunoser/calendar"):
    nodes = []
    for name, value in (("Start Date", start), ("Target Date", end)):
        if value is not None:
            nodes.append({"date": value, "field": {"name": name}})
    return {
        "updatedAt": "2026-08-19T02:03:04Z",
        "content": {
            "number": 1,
            "title": "Tokyo, day; one",
            "url": "https://github.com/zunoser/calendar/issues/1",
            "updatedAt": "2026-08-19T01:02:03Z",
            "repository": {"nameWithOwner": repository},
        },
        "fieldValues": {"nodes": nodes},
    }


class EventTest(unittest.TestCase):
    def test_strict_date_parsing(self):
        self.assertEqual(parse_date("2026-08-19"), date(2026, 8, 19))
        for value in (None, "", "2026/08/19", "2026-8-19", "2026-02-30"):
            self.assertIsNone(parse_date(value))

    def test_missing_or_invalid_both_is_skipped(self):
        self.assertIsNone(
            event_from_item(item(), "zunoser/calendar", "Start Date", "Target Date")
        )
        self.assertIsNone(
            event_from_item(
                item("not-a-date", "2026/08/19"),
                "zunoser/calendar",
                "Start Date",
                "Target Date",
            )
        )

    def test_one_valid_date_becomes_one_day(self):
        cases = (
            ("2026-08-19", None),
            (None, "2026-08-19"),
            ("bad", "2026-08-19"),
        )
        for start, end in cases:
            event = event_from_item(
                item(start, end),
                "zunoser/calendar",
                "Start Date",
                "Target Date",
            )
            self.assertEqual(
                (event.start, event.end),
                (date(2026, 8, 19), date(2026, 8, 19)),
            )
            self.assertEqual(event.uid, "zunoser/calendar#1")

    def test_valid_range_is_inclusive_and_reversed_range_is_skipped(self):
        event = event_from_item(
            item("2026-08-19", "2026-08-21"),
            "zunoser/calendar",
            "Start Date",
            "Target Date",
        )
        self.assertEqual(
            (event.start, event.end),
            (date(2026, 8, 19), date(2026, 8, 21)),
        )
        self.assertIsNone(
            event_from_item(
                item("2026-08-21", "2026-08-19"),
                "zunoser/calendar",
                "Start Date",
                "Target Date",
            )
        )

    def test_other_repository_is_ignored(self):
        self.assertIsNone(
            event_from_item(
                item("2026-08-19", repository="zunoser/other"),
                "zunoser/calendar",
                "Start Date",
                "Target Date",
            )
        )

    def test_calendar_uses_exclusive_end_and_escapes_text(self):
        calendar = render_calendar(
            "calendar",
            [
                Event(
                    "I_1",
                    "Tokyo, day; one\\two",
                    "https://example.com/1",
                    date(2026, 8, 19),
                    date(2026, 8, 21),
                    datetime(2026, 8, 19, tzinfo=timezone.utc),
                )
            ],
        ).decode()
        self.assertIn("DTSTART;VALUE=DATE:20260819\r\n", calendar)
        self.assertIn("DTEND;VALUE=DATE:20260822\r\n", calendar)
        self.assertIn("SUMMARY:Tokyo\\, day\\; one\\\\two\r\n", calendar)
        self.assertTrue(calendar.endswith("END:VCALENDAR\r\n"))

    def test_lines_are_folded_by_utf8_octets(self):
        folded = fold_line("SUMMARY:" + "予定" * 40)
        self.assertGreater(len(folded), 1)
        self.assertTrue(all(len(line.encode()) <= 75 for line in folded))
        self.assertTrue(all(line.startswith(" ") for line in folded[1:]))


if __name__ == "__main__":
    unittest.main()
