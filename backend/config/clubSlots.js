/**
 * CENTRALIZED SLOT CONFIG FOR SMASHTEAM BADMINTON
 * Single source of truth across:
 * - Google Form definition/documentation
 * - Smart Monthly Importer & Parser
 * - Session matching & auto-enrollment
 * - Bulk Add Modal
 * - Subscription management & Frontend UI
 */

const CLUB_SLOTS = Object.freeze({
  WED_18_20: {
    code: 'WED_18_20',
    weekday: 3, // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    dayPrefix: 'WED',
    weekdayToken: 'WEDNESDAY',
    startTime: '18:00',
    endTime: '20:00',
    startHour: 18,
    endHour: 20,
    label: 'Thứ 4 — 18:00–20:00',
    shortLabel: 'T4 (18-20h)'
  },

  THU_17_19: {
    code: 'THU_17_19',
    weekday: 4,
    dayPrefix: 'THU',
    weekdayToken: 'THURSDAY',
    startTime: '17:00',
    endTime: '19:00',
    startHour: 17,
    endHour: 19,
    label: 'Thứ 5 — 17:00–19:00',
    shortLabel: 'T5 (17-19h)'
  },

  THU_18_20: {
    code: 'THU_18_20',
    weekday: 4,
    dayPrefix: 'THU',
    weekdayToken: 'THURSDAY',
    startTime: '18:00',
    endTime: '20:00',
    startHour: 18,
    endHour: 20,
    label: 'Thứ 5 — 18:00–20:00',
    shortLabel: 'T5 (18-20h)'
  },

  SAT_18_20: {
    code: 'SAT_18_20',
    weekday: 6,
    dayPrefix: 'SAT',
    weekdayToken: 'SATURDAY',
    startTime: '18:00',
    endTime: '20:00',
    startHour: 18,
    endHour: 20,
    label: 'Thứ 7 — 18:00–20:00',
    shortLabel: 'T7 (18-20h)'
  }
});

// Map weekday index (0-6) -> list of configured slot codes for that weekday
const SLOTS_BY_WEEKDAY = Object.freeze(
  Object.values(CLUB_SLOTS).reduce((acc, slot) => {
    if (!acc[slot.weekday]) acc[slot.weekday] = [];
    acc[slot.weekday].push(slot.code);
    return acc;
  }, {})
);

// Map weekday name in Vietnamese to weekday index (0-6)
const VI_WEEKDAY_MAP = Object.freeze({
  'thứ hai': 1,
  'thứ 2': 1,
  't2': 1,
  'thứ ba': 2,
  'thứ 3': 2,
  't3': 2,
  'thứ tư': 3,
  'thứ 4': 3,
  't4': 3,
  'thứ năm': 4,
  'thứ 5': 4,
  't5': 4,
  'thứ sáu': 5,
  'thứ 6': 5,
  't6': 5,
  'thứ bảy': 6,
  'thứ 7': 6,
  't7': 6,
  'chủ nhật': 0,
  'cn': 0
});

module.exports = {
  CLUB_SLOTS,
  SLOTS_BY_WEEKDAY,
  VI_WEEKDAY_MAP
};
