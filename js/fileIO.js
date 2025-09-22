/**
 * @typedef {Object} AppInterface
 * @property {KintaiEntry[]} log
 * @property {function():void} saveAndRender
 */

/**
 * ファイル入出力を担当するユーティリティクラス
 */
class FileIO {
  /**
   * @param {AppInterface} appInstance
   */
  constructor(appInstance) {
    /** @private @type {AppInterface} */
    this.app = appInstance;
  }

  /**
   * JSON ファイルを読み込み、アプリのログを置き換えます。
   * @returns {void}
   */
  importData() {
    const input = document.getElementById('importFile');
    if (!input || !input.files.length) {
      alert('ファイルを選択してください');
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        /** @type {any} */
        const importedData = JSON.parse(e.target.result);
        if (Array.isArray(importedData)) {
          this.app.log = importedData;
          this.app.saveAndRender();
          alert('インポート成功しました');
        } else {
          alert('無効なファイル形式です');
        }
      } catch (err) {
        alert('読み込みエラー: ' + err.message);
      }
    };

    reader.readAsText(file);
  }

  /**
   * アプリログを JSON としてエクスポートします。
   * @returns {void}
   */
  exportData() {
    const dataStr = JSON.stringify(this.app.log, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'kintai_log.json';
    a.click();

    URL.revokeObjectURL(url);
  }
}
