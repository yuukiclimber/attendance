class AttendanceStorage {
  constructor(key = "kintai_log") {
    this.key = key;
  }

  load() {
    try {
      const data = localStorage.getItem(this.key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  save(log) {
    localStorage.setItem(this.key, JSON.stringify(log));
  }

  export(log) {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kintai_log.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  import(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error("Invalid format");
        onSuccess(data);
      } catch (err) {
        onError(err);
      }
    };
    reader.readAsText(file);
  }
}

class AttendanceLogger {
  constructor(storage) {
    this.storage = storage;
    this.log = this.storage.load();
    this.editingIndex = null;
  }

  addOrUpdate(entry) {
    if (this.editingIndex !== null) {
      this.log[this.editingIndex] = entry;
      this.editingIndex = null;
    } else {
      this.log.push(entry);
    }
    this.storage.save(this.log);
  }

  delete(index) {
    if (index >= 0 && index < this.log.length) {
      this.log.splice(index, 1);
      this.storage.save(this.log);
    }
  }

  setEditing(index) {
    if (index >= 0 && index < this.log.length) {
      this.editingIndex = index;
      return this.log[index];
    }
    return null;
  }

  clearEditing() {
    this.editingIndex = null;
  }

  getEditingIndex() {
    return this.editingIndex;
  }

  getLog() {
    return this.log;
  }

  import(data) {
    this.log = data;
    this.storage.save(this.log);
    this.clearEditing();
  }

  export() {
    this.storage.export(this.log);
  }
}

class AttendanceRenderer {
  constructor(logger) {
    this.logger = logger;
    this.monthNamesJP = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
  }

  formatHours(hours) {
    const n = +hours;
    return Number.isInteger(n) ? `${n}` : n.toFixed(2).replace(/\.0+$/, "").replace(/\.([1-9]*)0+$/, ".$1");
  }

  getWeekStartDate(dateStr) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - ((d.getDay() || 7) - 1));
    return d.toISOString().slice(0, 10);
  }

  renderLogTable() {
    const tbody = document.getElementById("log");
    tbody.innerHTML = "";
    // 降順（日付＋開始時間）
    const sortedLog = [...this.logger.getLog()].sort((a, b) => (a.date + a.start < b.date + b.start ? 1 : -1));

    sortedLog.forEach(({ date, start, end, hours, memo }, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${date}</td>
        <td>${start}</td>
        <td>${end}</td>
        <td>${this.formatHours(hours)}</td>
        <td>${memo || ""}</td>
        <td>
          <button class="edit-btn" data-index="${index}">編集</button>
          <button class="delete-btn" data-index="${index}">削除</button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  renderSummary() {
    const summaryMonth = {}, summaryWeek = {};
    this.logger.getLog().forEach(({ date, hours }) => {
      const month = date.slice(0, 7);
      const weekStart = this.getWeekStartDate(date);
      summaryMonth[month] = (summaryMonth[month] || 0) + +hours;
      summaryWeek[weekStart] = (summaryWeek[weekStart] || 0) + +hours;
    });

    const summaryDiv = document.getElementById("summary");
    summaryDiv.innerHTML =
      "📊 月別労働時間：<br>" +
      Object.entries(summaryMonth).map(([m, t]) => `${m}: ${this.formatHours(t)} 時間`).join("<br>") +
      "<br><br>📅 週別労働時間：<br>" +
      Object.entries(summaryWeek).map(([w, t]) => `${w}: ${this.formatHours(t)} 時間`).join("<br>");
  }

  getAllDailyTotals() {
    const totals = {};
    this.logger.getLog().forEach(({ date, hours }) => {
      totals[date] = (totals[date] || 0) + +hours;
    });
    return totals;
  }

  renderCalendar(year, month) {
    const tbody = document.getElementById("calendar-body");
    const header = document.getElementById("calendar-header");
    tbody.innerHTML = "";
    header.textContent = `${year}年 ${this.monthNamesJP[month]}`;

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startOffset = (first.getDay() || 7) - 1;
    const totalDays = last.getDate();
    const totals = this.getAllDailyTotals();
    const weeklySums = {};

    const pushWeekTotal = (tr, dateStr) => {
      const weekStart = this.getWeekStartDate(dateStr);
      const sum = this.formatHours(weeklySums[weekStart] || 0);
      const td = document.createElement("td");
      td.className = "week-total";
      td.textContent = `${sum} 時間`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    };

    let tr = document.createElement("tr");

    // 前月末の日数分
    for (let i = 0; i < startOffset; i++) {
      const prevDate = new Date(year, month, -startOffset + i + 1);
      const dStr = prevDate.toISOString().slice(0, 10);
      const td = document.createElement("td");
      td.className = "other-month";
      td.innerHTML = `<strong>${prevDate.getMonth() + 1}/${prevDate.getDate()}</strong><br>` +
                     (totals[dStr] ? this.formatHours(totals[dStr]) + " 時間" : "");
      tr.appendChild(td);
      weeklySums[this.getWeekStartDate(dStr)] = (weeklySums[this.getWeekStartDate(dStr)] || 0) + (totals[dStr] || 0);
    }

    // 今月の日数分
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      const dStr = d.toISOString().slice(0, 10);

      // 週始まり（月曜）で新しい行に切り替え
      if ((startOffset + day - 1) % 7 === 0 && day !== 1) {
        pushWeekTotal(tr, dStr);
        tr = document.createElement("tr");
      }

      const td = document.createElement("td");
      td.innerHTML = `<strong>${d.getMonth() + 1}/${d.getDate()}</strong><br>` +
                     (totals[dStr] ? this.formatHours(totals[dStr]) + " 時間" : "");
      tr.appendChild(td);

      weeklySums[this.getWeekStartDate(dStr)] = (weeklySums[this.getWeekStartDate(dStr)] || 0) + (totals[dStr] || 0);
    }

    // 来月の余り日を埋める
    while (tr.children.length < 7) {
      const d = new Date(year, month + 1, tr.children.length - startOffset + 1);
      const dStr = d.toISOString().slice(0, 10);
      const td = document.createElement("td");
      td.className = "other-month";
      td.innerHTML = `<strong>${d.getMonth() + 1}/${d.getDate()}</strong><br>` +
                     (totals[dStr] ? this.formatHours(totals[dStr]) + " 時間" : "");
      tr.appendChild(td);
      weeklySums[this.getWeekStartDate(dStr)] = (weeklySums[this.getWeekStartDate(dStr)] || 0) + (totals[dStr] || 0);
    }

    pushWeekTotal(tr, `${year}-${String(month + 1).padStart(2, "0")}-${totalDays}`);
  }
}

class AppController {
  constructor() {
    this.storage = new AttendanceStorage();
    this.logger = new AttendanceLogger(this.storage);
    this.renderer = new AttendanceRenderer(this.logger);

    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();

    // Bind methods
    this.record = this.record.bind(this);
    this.handleEditDelete = this.handleEditDelete.bind(this);
    this.changeMonth = this.changeMonth.bind(this);
    this.importData = this.importData.bind(this);
    this.exportData = this.exportData.bind(this);
  }

  init() {
    this.cacheDom();
    this.bindEvents();
    this.renderAll();
  }

  cacheDom() {
    this.dateInput = document.getElementById("date");
    this.startInput = document.getElementById("start");
    this.endInput = document.getElementById("end");
    this.memoInput = document.getElementById("memo");
    this.recordBtn = document.getElementById("recordBtn");
    this.logTbody = document.getElementById("log");
    this.prevMonthBtn = document.getElementById("prevMonthBtn");
    this.nextMonthBtn = document.getElementById("nextMonthBtn");
    this.importFile = document.getElementById("importFile");
    this.importBtn = document.getElementById("importBtn");
    this.exportBtn = document.getElementById("exportBtn");
  }

  bindEvents() {
    this.recordBtn.addEventListener("click", this.record);
    this.logTbody.addEventListener("click", this.handleEditDelete);
    this.prevMonthBtn.addEventListener("click", () => this.changeMonth(-1));
    this.nextMonthBtn.addEventListener("click", () => this.changeMonth(1));
    this.importBtn.addEventListener("click", () => this.importFile.click());
    this.importFile.addEventListener("change", this.importData);
    this.exportBtn.addEventListener("click", this.exportData);
  }

  clearInput() {
    this.dateInput.value = "";
    this.startInput.value = "";
    this.endInput.value = "";
    this.memoInput.value = "";
    this.recordBtn.textContent = "記録する";
  }

  validateInput() {
    if (!this.startInput.value || !this.endInput.value) {
      alert("開始時間と終了時間を入力してください");
      return false;
    }
    const [sh, sm] = this.startInput.value.split(":");
    const [eh, em] = this.endInput.value.split(":");
    const startMin = +sh * 60 + +sm;
    const endMin = +eh * 60 + +em;
    if (endMin < startMin) {
      alert("終了時間は開始時間より後にしてください");
      return false;
    }
    return true;
  }

  record() {
    if (!this.validateInput()) return;

    const date = this.dateInput.value || new Date().toISOString().slice(0, 10);
    const start = this.startInput.value;
    const end = this.endInput.value;
    const memo = this.memoInput.value.trim();
    const [sh, sm] = start.split(":");
    const [eh, em] = end.split(":");
    const startMin = +sh * 60 + +sm;
    const endMin = +eh * 60 + +em;
    const hours = ((endMin - startMin) / 60).toFixed(2);

    const entry = { date, start, end, hours, memo };

    this.logger.addOrUpdate(entry);

    this.clearInput();
    this.renderAll();
  }

  handleEditDelete(e) {
    if (e.target.classList.contains("edit-btn")) {
      const index = Number(e.target.dataset.index);
      const entry = this.logger.setEditing(index);
      if (entry) {
        this.dateInput.value = entry.date;
        this.startInput.value = entry.start;
        this.endInput.value = entry.end;
        this.memoInput.value = entry.memo;
        this.recordBtn.textContent = "更新する";
      }
    } else if (e.target.classList.contains("delete-btn")) {
      const index = Number(e.target.dataset.index);
      if (confirm("この記録を削除しますか？")) {
        this.logger.delete(index);
        if (this.logger.getEditingIndex() === index) {
          this.clearInput();
          this.logger.clearEditing();
        }
        this.renderAll();
      }
    }
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
    this.renderCalendar();
  }

  importData(event) {
    const file = event.target.files[0];
    if (!file) return alert("ファイルが選択されていません");

    this.storage.import(file,
      data => {
        this.logger.import(data);
        this.clearInput();
        this.renderAll();
        alert("インポートが完了しました");
        // Reset input value to allow same file upload again if needed
        this.importFile.value = "";
      },
      err => alert("読み込みエラー：JSONの解析に失敗しました")
    );
  }

  exportData() {
    this.logger.export();
  }

  renderAll() {
    this.renderer.renderLogTable();
    this.renderer.renderSummary();
    this.renderCalendar();
  }

  renderCalendar() {
    this.renderer.renderCalendar(this.currentYear, this.currentMonth);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const app = new AppController();
  app.init();
});
