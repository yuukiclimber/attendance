/**
 * 小数点以下のゼロを除去して文字列化する関数
 * calendar.js と共通で利用されるため、共通ユーティリティファイルに移動も検討
 */
/**
 * @typedef {Object} KintaiEntry
 * @property {string} date - YYYY-MM-DD
 * @property {string} start - HH:MM
 * @property {string} end - HH:MM
 * @property {string|number} hours - 労働時間（文字列化されることがある）
 * @property {string} [memo]
 */

/**
 * 小数点以下のゼロを削除して文字列化します。
 * エディタの型補完用に JSDoc を追加しています。
 * @param {number|string} hours
 * @returns {string}
 */
function formatHours(hours) {
  const n = Number(hours);
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * 週の開始日（日曜）を取得します。
 * @param {string} dateStr - 日付文字列 (YYYY-MM-DD)
 * @returns {string} 週の開始日 (YYYY-MM-DD)
 */
function getWeekStartDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 日:0, 月:1, ..., 土:6
  const diff = -day; // 日曜日基準で差分を計算
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}
