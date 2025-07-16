/**
 * 小数点以下のゼロを除去して文字列化する関数
 * calendar.js と共通で利用されるため、共通ユーティリティファイルに移動も検討
 */
function formatHours(hours) {
  const n = Number(hours);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * 週の開始日（月曜）を取得
 * calendar.js と共通で利用されるため、共通ユーティリティファイルに移動も検討
 */
function getWeekStartDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
