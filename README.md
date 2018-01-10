# WZReport
当前版本：v0.0.3
## Why
当我们要处理中国式报表（多层级的合计，还需要合并单元格等等）的时候，往往需要使用第三方的报表工具，例如帆软、润乾或者开源的ireport等等。
希望能够通过简单的js来实现中国式报表在html上的展示（当然需要有所限制，不能随心所欲）。因此尝试写了这个js库，并希望能尽可能的完善它。

## What
WZReport库由js实现，作为jquery插件使用，使用前先导入jquery的库。

## How
1.接收数据的格式

colConf说明
* val:列显示名，对应模板中表头的显示列名(数量要和模板中的列数量一致且顺序一致)
* colName:列物理名，对应SQL查询出来的列名或数据库中的列名
* type:列类别(G-分组列,需要按该列进行统计;S-明细列,仅循环展示该列数据)
       分组列必须在最左侧，一旦遇到非分组列，则后续列均不会再作为分组列进行处理，且大分组在左，小分组在右
* fn:统计方法(sum-求该列之和;count-求该列数据数量;max-求该列最大值;min-求该列最小值;avg-求该列平均值;其他-表达式计算;空-无计算)
* merge:是否将该列值一致的相邻单元格进行合并(true-需要合并;false-不需要合并)

data说明
* val:该列的数据值
    
```bash
var datas={
    "code": 结果Code,
    "msg": 结果消息,
    "title": "报表标题",
    "colConf": [
        {"val":A列显示名,"colName":A列物理名,"type":"G","fn":"","merge":true},
        {"val":B列显示名,"colName":B列物理名,"type":"G","fn":"","merge":true},
        {"val":C列显示名,"colName":C列物理名,"type":"G","fn":"","merge":true},
        {"val":D列显示名,"colName":D列物理名,"type":"S","fn":"","merge":false},
        {"val":E列显示名,"colName":E列物理名,"type":"S","fn":"sum","merge":false},
        {"val":F列显示名,"colName":F列物理名,"type":"S","fn":"","merge":false}
    ],
    "data": [
        {A列物理名:A列数据1,B列物理名:B列数据1,C列物理名:C列数据1,D列物理名:D列数据1,E列物理名:E列数据1,F列物理名:F列数据1},
        {A列物理名:A列数据2,B列物理名:B列数据2,C列物理名:C列数据2,D列物理名:D列数据2,E列物理名:E列数据2,F列物理名:F列数据2}
    ]
}
```
2.报表模板,只要将表头写好即可，举例如下
```bash
<table id="tableName" border="1" cellpadding="0px" cellspacing="0px" style="text-align: center;padding: 0px;margin: 0px;border-color: #000;border-width: 1px;">
  <thead>
    <tr>
      <td colspan="14" style="text-align: center;font-size: 2em;font-weight: bolder;" id="tableTitle"></td>
    </tr>
    <tr>
      <th rowspan="2">列A</th>
      <th colspan="2">BC组合列</th>
      <th rowspan="2">列D</th>
      <th rowspan="2">列E</th>
      <th rowspan="2">列F</th>
    </tr>
    <tr>
      <th>列B</th>
      <th>列C</th>
    </tr>
  </thead>
  <tbody id="tableBody">
  </tbody>
</table>
```
3.使用方法
* 预览报表 
```bash
$().displayReport({tblTitle:datas.title,tblTitleId:"tableTitle",tblBodyId:"tableBody",tblConf:datas.colConf,tblDetailData:datas.data});
```
## Pay attention to
* 返回数据中colConf中的元素数量要和模板中的列数量一致且顺序一致；
* 返回数据内colConf中type为G的列为分组列，会根据这些列进行统计，必须在最左侧，一旦遇到type不是G的列，则后续列均不会再作为分组列进行处理，且大分组在左，小分组在右；
* 可以通过报表表头的样式设置来规范报表每列展示的宽度。
