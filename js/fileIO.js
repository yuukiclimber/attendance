// --- インポート関数 ---
function importData() {
  const input = document.getElementById("importFile");
  if (!input || !input.files.length) {
    alert("ファイルを選択してください");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      if (Array.isArray(importedData)) {
        log = importedData; // log を更新
        saveAndRender();
        alert("インポート成功しました");
      } else {
        alert("無効なファイル形式です");
      }
    } catch (err) {
      alert("読み込みエラー: " + err.message);
    }
  };

  reader.readAsText(file);
}

// --- エクスポート関数 ---
function exportData() {
  const dataStr = JSON.stringify(log, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "kintai_log.json";
  a.click();

  URL.revokeObjectURL(url);
}
