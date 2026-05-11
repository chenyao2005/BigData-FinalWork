# NYC ZIPCode 人口与族裔数据（2023）

- 统计单元：ZIP Code Tabulation Area (ZCTA)，并用项目现有 NYC ZIP 清单过滤
- 来源：ACS 2023 5-year (ZCTA)
- 字段：total/white/black/asian/hispanic/other
- other = total - white - black - asian - hispanic（不足 0 按 0 处理）

- 记录数（NYC ZIP）：177

## 文件说明
- `../raw/*.json`：原始 API 返回
- `nyc_zipcode_population_2023.csv`：宽表（推荐主文件）
- `nyc_zipcode_population_2023.json`：宽表 JSON
- `dimensions/*.csv`：按单指标拆分文件