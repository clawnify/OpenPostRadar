-- Synthetic data, loaded only by the disposable demo runtime. A fictional
-- scheduling product for small clinics; every person, post and link is made up.
INSERT INTO voices (id, org_id, name, kind, profile_url, notes, created_at) VALUES
 ('demo-voice-jane', 'demo', 'Jane Okafor', 'person', NULL, 'Founder. Plain and direct. Says what she has seen, never sells.', strftime('%Y-%m-%dT%H:%M:%fZ','now','-20 days')),
 ('demo-voice-marcus', 'demo', 'Marcus Lee', 'person', NULL, 'Customer success. Friendly and practical, answers with an example.', strftime('%Y-%m-%dT%H:%M:%fZ','now','-20 days')),
 ('demo-voice-company', 'demo', 'Harbour', 'company', NULL, 'The company page. Only for posts about Harbour itself.', strftime('%Y-%m-%dT%H:%M:%fZ','now','-20 days'));

INSERT INTO searches (id, org_id, query, platform, intent, active, last_run_at, last_found, created_at) VALUES
 ('demo-search-clinic', 'demo', 'best scheduling software for a small clinic', 'reddit', 'Clinic owners and managers asking which scheduling or booking software to use.', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 4, strftime('%Y-%m-%dT%H:%M:%fZ','now','-20 days')),
 ('demo-search-paper', 'demo', 'switching from paper appointment book', 'reddit', 'People moving off paper or an old booking system, and what made them switch.', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 2, strftime('%Y-%m-%dT%H:%M:%fZ','now','-18 days')),
 ('demo-search-manager', 'demo', 'clinic manager scheduling software', 'linkedin', 'Clinic managers asking for a recommendation for scheduling software.', 1, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 0, strftime('%Y-%m-%dT%H:%M:%fZ','now','-12 days'));

INSERT INTO posts (id, org_id, platform, url, author_name, author_headline, author_url, text, posted_at, found_at, search_id, language, relevance, reason, suggested_comment, original_comment, voice_id, status, dismiss_reason, final_comment, decided_by, decided_at, created_at) VALUES
 ('demo-post-1', 'demo', 'reddit', 'https://www.reddit.com/r/smallbusiness/comments/demo001/paper_book_and_no_shows', 'u/clinic_owner_marta', 'r/smallbusiness', NULL,
  'Our clinic still runs on a paper appointment book and no-shows are killing us. Three therapists, about 60 appointments a week. What do you use for scheduling and reminders? Ideally nothing that takes a month to set up.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 hours'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 'demo-search-clinic', 'en', 94,
  'Asks which scheduling tool to use, names no-shows as the pain, small clinic.',
  'Three therapists and 60 a week is where paper starts to hurt. What cut no-shows most for the clinics I have seen was a text reminder the day before with a one-tap reschedule link, more than any calendar feature. Do you know how many no-shows are people who forgot versus people who needed to move?',
  'Three therapists and 60 a week is where paper starts to hurt. What cut no-shows most for the clinics I have seen was a text reminder the day before with a one-tap reschedule link, more than any calendar feature. Do you know how many no-shows are people who forgot versus people who needed to move?',
  'demo-voice-jane', 'new', NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours')),
 ('demo-post-2', 'demo', 'reddit', 'https://www.reddit.com/r/ClinicOpsDemo/comments/demo002/leaving_our_booking_system', 'u/ops_lead_dan', 'r/ClinicOpsDemo', NULL,
  'We are leaving our booking system next month. It charges per therapist and we are adding two more. Has anyone moved to something simpler? Need online booking and reminders, no long contract.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-9 hours'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 'demo-search-paper', 'en', 88,
  'Looking to switch and names per-seat pricing as the reason. The rules allow a product mention once you have answered three other posts this month, so check before you post.',
  'Per-seat pricing is the usual reason clinics leave once they grow past a few therapists. Before you pick, ask each one what a ninth therapist would cost and whether the reminders are included or extra. What is the one thing the old system did that you cannot lose?',
  'Per-seat pricing is the usual reason clinics leave once they grow past a few therapists. Before you pick, ask each one what a ninth therapist would cost and whether the reminders are included or extra. What is the one thing the old system did that you cannot lose?',
  'demo-voice-marcus', 'new', NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours')),
 ('demo-post-3', 'demo', 'reddit', 'https://www.reddit.com/r/smallbusiness/comments/demo003/free_calendar_link_or_booking_tool', 'u/massage_by_priya', 'r/smallbusiness', NULL,
  'Solo massage therapist here. Is it worth paying for online booking or should I just use a free calendar link? I get maybe 15 clients a week.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 'demo-search-clinic', 'en', 71,
  'The right question, but a solo practice may be too small for the product. Answer it honestly, including that a free link can be enough.',
  'At 15 clients a week a free calendar link is often enough. It starts to stop being enough when people ask to reschedule by text and you are doing it by hand. Count how many of those messages you answered last week: if it is more than a handful, that is the point to pay for something.',
  'At 15 clients a week a free calendar link is often enough. It starts to stop being enough when people ask to reschedule by text and you are doing it by hand. Count how many of those messages you answered last week: if it is more than a handful, that is the point to pay for something.',
  'demo-voice-jane', 'new', NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours')),
 ('demo-post-4', 'demo', 'reddit', 'https://www.reddit.com/r/smallbusiness/comments/demo004/cutting_no_shows_in_service_businesses', 'u/studio_owner_tess', 'r/smallbusiness', NULL,
  'What is the best way to cut no-shows in a service business? Deposits, reminders, a cancellation fee? Curious what actually worked for people.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-2 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), 'demo-search-clinic', 'en', 58,
  'Broad, not clinic-specific, and already well covered in the thread. Answer only if you can add something specific.',
  'Reminders did more than deposits in the businesses I have seen, because most no-shows are forgetting, not refusing. A text the day before that lets people move the slot in one tap recovers a lot of them. A deposit still makes sense for the long, expensive slots.',
  'Reminders did more than deposits in the businesses I have seen, because most no-shows are forgetting, not refusing. A text the day before that lets people move the slot in one tap recovers a lot of them. A deposit still makes sense for the long, expensive slots.',
  'demo-voice-marcus', 'new', NULL, NULL, NULL, NULL, strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours')),
 ('demo-post-5', 'demo', 'reddit', 'https://www.reddit.com/r/smallbusiness/comments/demo005/double_bookings_with_two_front_desk_staff', 'u/clinic_owner_ravi', 'r/smallbusiness', NULL,
  'How do you handle double-bookings when two people on the front desk both take bookings? We keep ending up with two patients in one slot.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days'), 'demo-search-clinic', 'en', 90,
  'Describes a problem the product solves, in a small clinic.',
  'Double-bookings usually come from two people editing separate calendars. One shared calendar that locks the slot the moment someone starts booking it fixes most of it. Do you both also take bookings by phone?',
  'Double-bookings usually come from two people editing separate calendars. One shared calendar that locks the slot the moment someone starts booking it fixes most of it. Do you both also take bookings by phone?',
  'demo-voice-jane', 'commented', NULL,
  'Double-bookings usually come from two people editing separate calendars. One shared calendar that locks the slot the moment someone starts booking it fixes most of it. I work on a scheduling tool for clinics, so I am biased, but any shared calendar with locking does this. Do you both also take bookings by phone?',
  'demo-user', strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-4 days')),
 ('demo-post-6', 'demo', 'reddit', 'https://www.reddit.com/r/smallbusiness/comments/demo006/need_a_developer_for_a_booking_app', 'u/founder_leo', 'r/smallbusiness', NULL,
  'Looking for a developer to build me a booking app for my gym. Budget is flexible. DM me.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days'), 'demo-search-clinic', 'en', 34,
  'A job ad, not someone asking which tool to use.',
  'You may not need to build one: most gyms start with an off-the-shelf booking tool and only build when they outgrow it. What does the app need to do that those cannot?',
  'You may not need to build one: most gyms start with an off-the-shelf booking tool and only build when they outgrow it. What does the app need to do that those cannot?',
  'demo-voice-marcus', 'dismissed', 'Not relevant', NULL, 'demo-user', strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 days')),
 ('demo-post-7', 'demo', 'reddit', 'https://www.reddit.com/r/ClinicOpsDemo/comments/demo007/we_launched_a_booking_app_for_clinics', 'u/booknest_team', 'r/ClinicOpsDemo', NULL,
  'We just launched a booking app for clinics and would love your feedback. Free for the first 50 clinics.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days'), 'demo-search-paper', 'en', 41,
  'Another vendor promoting its own product.',
  'Congratulations on the launch. What made you start with clinics and not another kind of appointment business?',
  'Congratulations on the launch. What made you start with clinics and not another kind of appointment business?',
  'demo-voice-jane', 'dismissed', 'A competitor', NULL, 'demo-user', strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days')),
 ('demo-post-8', 'demo', 'reddit', 'https://www.reddit.com/r/ClinicOpsDemo/comments/demo008/which_booking_tool_do_you_use', 'u/front_desk_nina', 'r/ClinicOpsDemo', NULL,
  'Which booking tool do you use for a two-room physio clinic? Looking for ideas.',
  strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'), 'demo-search-paper', 'en', 76,
  'Asks which tool to use, but the thread already has a long answer the author accepted.',
  'Two rooms is small enough that most tools will work, so the deciding factor is usually reminders and how the patient reschedules. Which of those matters most to you?',
  'Two rooms is small enough that most tools will work, so the deciding factor is usually reminders and how the patient reschedules. Which of those matters most to you?',
  'demo-voice-marcus', 'dismissed', 'Already answered', NULL, 'demo-user', strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'), strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'));

INSERT INTO playbook (org_id, body, updated_at, updated_by) VALUES
 ('demo', 'Reddit
- "best scheduling software for a small clinic": returned 9, kept 4 (26 Nov). Best wording so far.
- "switching from paper appointment book": returned 6, kept 2 (26 Nov). Finds people leaving a system.
- Phrases that find real asks: "what do you use for", "anyone switched from", "recommendations for".
- Threads whose first reply the author accepted are usually finished: skip them.
LinkedIn
- "clinic manager scheduling software": returned 0 for two runs. Candidate to pause.', strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 day'), 'agent');
