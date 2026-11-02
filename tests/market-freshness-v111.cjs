'use strict';

const TIME_ZONE = 'Asia/Tehran';
const TRADING_WEEKDAYS = new Set(['Sat', 'Sun', 'Mon', 'Tue', 'Wed']);
const SESSION_START_SECONDS = 9 * 60 * 60;
const SESSION_END_SECONDS = 12 * 60 * 60 + 30 * 60;

function tehranParts(value = new Date()) {
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new TypeError('Invalid timestamp');
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(instant)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value])
  );
  const date = parts.year + parts.month + parts.day;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  return {
    date,
    weekday: parts.weekday,
    hour,
    minute,
    second,
    secondsOfDay: hour * 3600 + minute * 60 + second,
    time: [parts.hour, parts.minute, parts.second].join(':')
  };
}

function parseTradeTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) return null;
  const digits = String(number).padStart(6, '0');
  if (digits.length !== 6) return null;
  const hour = Number(digits.slice(0, 2));
  const minute = Number(digits.slice(2, 4));
  const second = Number(digits.slice(4, 6));
  if (hour > 23 || minute > 59 || second > 59) return null;
  return {
    digits,
    hour,
    minute,
    second,
    secondsOfDay: hour * 3600 + minute * 60 + second,
    time: digits.slice(0, 2) + ':' + digits.slice(2, 4) + ':' + digits.slice(4, 6)
  };
}

function classifyTehranQuoteFreshness({
  marketDate,
  lastTradeTime,
  now = new Date(),
  maxAgeMinutes = 15
}) {
  if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes < 0) {
    throw new TypeError('maxAgeMinutes must be a non-negative number');
  }
  const local = tehranParts(now);
  const inRegularSession =
    TRADING_WEEKDAYS.has(local.weekday) &&
    local.secondsOfDay >= SESSION_START_SECONDS &&
    local.secondsOfDay < SESSION_END_SECONDS;

  const base = {
    marketDate: String(marketDate ?? ''),
    tehranDate: local.date,
    tehranTime: local.time,
    maxAgeMinutes
  };

  if (!inRegularSession) {
    return {
      status: 'UNVERIFIED_OUTSIDE_SESSION',
      reason: 'outside_regular_tehran_trading_session',
      ...base
    };
  }

  if (String(marketDate ?? '') !== local.date) {
    return {
      status: 'UNVERIFIED_STALE_SESSION_DATE',
      reason: 'quote_date_is_not_current_tehran_trading_date',
      ...base
    };
  }

  const trade = parseTradeTime(lastTradeTime);
  if (!trade) {
    return {
      status: 'UNVERIFIED_MISSING_TRADE_TIME',
      reason: 'official_last_trade_time_missing_or_invalid',
      ...base
    };
  }

  const ageSeconds = local.secondsOfDay - trade.secondsOfDay;
  if (ageSeconds < 0 || ageSeconds > maxAgeMinutes * 60) {
    return {
      status: 'UNVERIFIED_STALE_TRADE',
      reason: 'last_trade_time_is_outside_freshness_window',
      ageMinutes: ageSeconds / 60,
      lastTradeTime: trade.time,
      ...base
    };
  }

  return {
    status: 'FRESH',
    reason: 'current_session_quote_and_recent_trade_time_verified',
    ageMinutes: ageSeconds / 60,
    lastTradeTime: trade.time,
    ...base
  };
}

module.exports = {
  TIME_ZONE,
  tehranParts,
  parseTradeTime,
  classifyTehranQuoteFreshness
};
