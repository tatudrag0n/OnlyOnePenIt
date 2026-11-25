# OnlyOnePenIt

原始的なペイントツール / リアルペイントシミュレーションゲーム。

## 概要
鉛筆・シャーペン・消しゴムなど、文房具の消耗と物理をシミュレーションするペイントツールです。
所持金で文房具屋から道具を買い、紙に描いて、消しカスをゴミ箱に捨てて小銭を稼ぎます。
所持金が10000円を超えると家電量販店が出現し、100000円で液タブを購入するとゲームクリア。

## 起動
静的サイトです。`index.html` をブラウザで開くか、任意の静的サーバで配信してください。

```
python -m http.server 8000
```

## 操作
- 左ツールバーから道具を選択
- キャンバス上でドラッグして描画/消去
- 右パネルで道具の設定（硬さ、角切り替え、ノック等）
- 上部「文房具屋」で購入

## 公開
- 本番: https://onlyonepenit.mct-official.com/ （Cloudflare Workers、デプロイは `python3 ~/workspace/deploy-onlyonepenit.py`）
- GitHub: https://github.com/tatudrag0n/OnlyOnePenIt
- GitHub Pages: https://tatudrag0n.github.io/OnlyOnePenIt/
