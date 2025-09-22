// calendar.js
// CalendarView クラスにまとめたカレンダー表示ロジック
// calendar.js
// CalendarView クラスにまとめたカレンダー表示ロジック

class CalendarView {
  constructor() {
    this.currentYear = null;
    this.currentMonth = null;
    this.monthNamesJP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  }

  init() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.render([]);
  }

  changeMonth(diff) {
    this.currentMonth += diff;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
    // app.render() 呼び出しで calendar.render(this.log) が呼ばれるようにするのが自然
    if (typeof app !== 'undefined' && app) {
      app.render();
    } else {
      this.render([]);
    }
  }

  updateCalendarHeader() {
    const header = document.getElementById('calendar-header');
    if (header) {
      header.textContent = `${this.currentYear}年 ${this.monthNamesJP[this.currentMonth]}`;
    }
  }

  getAllDailyTotals(log) {
    const totals = {};
    if (Array.isArray(log)) {
      log.forEach(row => {
        const date = row.date;
        totals[date] = (totals[date] || 0) + parseFloat(row.hours);
      });
    }
    return totals;
  }

  createDateCell(dateStr, displayMonth, displayDay, dailyTotals, isOtherMonth = false) {
    const td = document.createElement('td');
    if (isOtherMonth) {
      td.className = 'other-month';
    } else {
      td.style.verticalAlign = 'top';
      td.style.height = '60px';
    }

    const dayHours = dailyTotals[dateStr] || 0;
    const hoursHtml = dayHours ? `<span class="daily-hours">${formatHours(dayHours)} 時間</span>` : '';
    td.innerHTML = `<strong>${displayMonth}/${displayDay}</strong><br>${hoursHtml}`;
    return td;
  }

  createWeekTotalCell(totalHours, cumulativeTotalHours) {
    const weekTotalTd = document.createElement('td');
    weekTotalTd.className = 'week-total';
    weekTotalTd.innerHTML = `${formatHours(totalHours)} 時間<br>${formatHours(cumulativeTotalHours)} 時間`;
    return weekTotalTd;
  }

  render(log) {
    const tbody = document.getElementById('calendar-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.currentYear === null) {
      this.init();
    }

    this.updateCalendarHeader();

    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    let firstWeekday = firstDay.getDay();

    const dailyTotals = this.getAllDailyTotals(log || []);
    const weeklyTotalsByWeekStart = {};
    let cumulativeTotalHours = 0;

    let tr = document.createElement('tr');

    const prevMonth = this.currentMonth === 0 ? 11 : this.currentMonth - 1;
    const prevYear = this.currentMonth === 0 ? this.currentYear - 1 : this.currentYear;
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();

    for (let i = 0; i < firstWeekday; i++) {
      const prevDay = prevMonthLastDay - (firstWeekday - i - 1);
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(prevDay).padStart(2, "0")}`;
      const dayHours = dailyTotals[dateStr] || 0;

      tr.appendChild(this.createDateCell(dateStr, prevMonth + 1, prevDay, dailyTotals, true));

      const weekStart = getWeekStartDate(dateStr);
      weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
    }

    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      if ((firstWeekday + day - 1) % 7 === 0 && day !== 1) {
        const prevWeekDate = new Date(this.currentYear, this.currentMonth, day - 1);
        const prevWeekStart = getWeekStartDate(prevWeekDate.toISOString().slice(0, 10));
        const weekTotal = weeklyTotalsByWeekStart[prevWeekStart] || 0;

        cumulativeTotalHours += weekTotal;
        tr.appendChild(this.createWeekTotalCell(weekTotal, cumulativeTotalHours));
        tbody.appendChild(tr);
        tr = document.createElement('tr');
      }

      const dateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayHours = dailyTotals[dateStr] || 0;

      tr.appendChild(this.createDateCell(dateStr, this.currentMonth + 1, day, dailyTotals));

      const weekStart = getWeekStartDate(dateStr);
      weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
    }

    let nextDay = 1;
    const nextMonth = (this.currentMonth + 1) % 12;
    const nextYear = (this.currentMonth === 11) ? this.currentYear + 1 : this.currentYear;
    while (tr.children.length < 7) {
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextDay).padStart(2, "0")}`;
      const dayHours = dailyTotals[dateStr] || 0;

      tr.appendChild(this.createDateCell(dateStr, nextMonth + 1, nextDay, dailyTotals, true));

      const weekStart = getWeekStartDate(dateStr);
      weeklyTotalsByWeekStart[weekStart] = (weeklyTotalsByWeekStart[weekStart] || 0) + dayHours;
      nextDay++;
    }

    const lastDayDateStr = `${this.currentYear}-${String(this.currentMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    const lastWeekStart = getWeekStartDate(lastDayDateStr);
    const lastWeekTotal = weeklyTotalsByWeekStart[lastWeekStart] || 0;

    cumulativeTotalHours = (cumulativeTotalHours || 0) + (lastWeekTotal || 0);
    tr.appendChild(this.createWeekTotalCell(lastWeekTotal, cumulativeTotalHours));
    tbody.appendChild(tr);
  }
}

// 互換性のためのグローバルラッパー（既存HTMLからの呼び出しを維持）
let _calendarInstance = null;
function initCalendar() {
  if (!_calendarInstance) _calendarInstance = new CalendarView();
  _calendarInstance.init();
}

function renderCalendar() {
  if (!_calendarInstance) _calendarInstance = new CalendarView();
  _calendarInstance.render(window.app ? window.app.log : []);
}

function changeMonth(diff) {
  if (!_calendarInstance) _calendarInstance = new CalendarView();
  _calendarInstance.changeMonth(diff);
}