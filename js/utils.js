/**
 * 小数点以下のゼロを除去して文字列化する関数
 * calendar.js と共通で利用されるため、共通ユーティリティファイルに移動も検討
 */
function formatHours(hours) {
  const n = Number(hours);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * 週の開始日（日曜）を取得
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {string} 週の開始日 (YYYY-MM-DD)
 */
function getWeekStartDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 日:0, 月:1, ..., 土:6
  // 日曜日始まりの場合、その日の曜日 (day) がそのまま週の開始日との差分となる
  // 例えば、日曜日 (0) なら差分は 0、月曜日 (1) なら差分は -1
  const diff = -day; // 日曜日を基準に差分を計算
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
