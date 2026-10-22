# B2B Sales Dashboard (frontend only)
React + Vite + Apache ECharts. Pure static site – no backend.

## Run
    npm install && npm run dev      # development
    npm run build                   # static site in dist/ (deploy to Netlify/S3/any web server)

## Data
- Default: `public/sample_sales.csv` (mock data, 450+ order lines).
- **Upload CSV** button, or **Load from API** (URL returning CSV or a JSON array).
- Columns: `order_id,date(YYYY-MM-DD),customer,region,product,quantity,unit_price[,sales_rep][,revenue]`.
  To change the default source, replace `public/sample_sales.csv` or edit `loadUrl('./sample_sales.csv')` in `src/App.jsx`.
- Field mapping lives in `src/data.js` → `normalize()`; rename keys there if your feed uses other column names.

## Features
KPIs with change vs. previous period · daily sales bar + 7-day average with zoom · revenue by product (click to drill down everywhere) · product × weekday heatmap · sortable/searchable customer table with CSV export · full purchase history per customer · date/region/product filters · responsive layout.

## Customising visuals
Colours/layout: `src/index.css`. Chart options are inline ECharts `option` objects in `src/App.jsx`.
