# Lambda Observe All stocks

A lambda function that will Execute a search, extract all stocks and set an identity to observe all the returned stocks

```
{
  "identity": "us-east-1:e4ecbb5c-7c33-46ae-951d-f109dba401bf",
  "search_url": "https://api.stocktio.com/search/filter",
  "alerts_url": "http://alerts.internal-stocktio.com/observe",
  "search_body": {
    "conditions": {
      "sic": ">0",
      "country_code": "usa"
    },
    "page": "1"
  },
  "max_pages": 30
}
```
