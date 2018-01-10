/**
 * Version 0.0.2 Copyright (C) 2018
 * Author:Wang Tao
 * 将接收到的明细数据根据设定计算各统计项，并自动生成统计行，以报表的形式展示
 * 1.接收数据的格式
 * colConf说明
 *     val:列名(数量要和模板中的列数量一致且顺序一致)
 *     type:列类别(G-分组列,需要按该列进行统计;S-明细列,仅循环展示该列数据)
 *          分组列必须在最左侧，一旦遇到非分组列，则后续列均不会再作为分组列进行处理，且大分组在左，小分组在右
 *     fn:统计方法(sum-求该列之和;count-求该列数据数量;max-求该列最大值;min-求该列最小值;avg-求该列平均值;其他-表达式计算;空-无计算)
 *     merge:是否将该列值一致的相邻单元格进行合并(true-需要合并;false-不需要合并)
 * data说明
 *     val:该列的数据值
 * var datas={
 *     "code": 结果Code,
 *     "msg": 结果消息,
 *     "title": "报表标题",
 *     "colConf": [
 *         {"val":A列名,"type":"G","fn":"","merge":true},
 *         {"val":B列名,"type":"G","fn":"","merge":true},
 *         {"val":C列名,"type":"G","fn":"","merge":true},
 *         {"val":D列名,"type":"S","fn":"","merge":false},
 *         {"val":E列名,"type":"S","fn":"sum","merge":false},
 *         {"val":F列名,"type":"S","fn":"","merge":false}
 *     ],
 *     "data": [
 *         [
 *             {"val":A列数据1},
 *             {"val":B列数据1},
 *             {"val":C列数据1},
 *             {"val":D列数据1},
 *             {"val":E列数据1},
 *             {"val":F列数据1}
 *         ],
 *         [
 *             {"val":A列数据2},
 *             {"val":B列数据2},
 *             {"val":C列数据2},
 *             {"val":D列数据2},
 *             {"val":E列数据2},
 *             {"val":F列数据2}
 *         ]
 *     ]
 * }
 * 2.报表模板,举例如下
 * <table id="tableName" border="1" cellpadding="0px" cellspacing="0px" style="text-align: center;padding: 0px;margin: 0px;border-color: #000;border-width: 1px;">
 *   <thead>
 *     <tr>
 *       <td colspan="14" style="text-align: center;font-size: 2em;font-weight: bolder;" id="tableTitle"></td>
 *     </tr>
 *     <tr>
 *       <th rowspan="2">列A</th>
 *       <th colspan="2">BC组合列</th>
 *       <th rowspan="2">列D</th>
 *       <th rowspan="2">列E</th>
 *       <th rowspan="2">列F</th>
 *     </tr>
 *     <tr>
 *       <th>列B</th>
 *       <th>列C</th>
 *     </tr>
 *   </thead>
 *   <tbody id="tableBody">
 *   </tbody>
 * </table>
 * 3.使用方法
 * 设置标题 $('#tableTitle').html(datas.title);
 * 预览报表 $().displayReport({tblBodyId:"tableBody",tblConf:datas.colConf,tblDetailData:datas.data});
 * 4.注意事项
 * a.返回数据中colConf中的元素数量要和模板中的列数量一致且顺序一致；
 * b.返回数据内colConf中type为G的列为分组列，会根据这些列进行统计，必须在最左侧，一旦遇到type不是G的列，则后续列均不会再作为分组列进行处理，且大分组在左，小分组在右；
 * c.可以通过报表表头的样式设置来规范报表每列展示的宽度。 
 */
;(function(){
    "use strict";
    //默认设定
    var defaults={
		tblTitle:"", //报表标题
		tblTitleId:"", //报表标题标签ID
        tblBodyId:"", //<tbody>标签的ID
        tblConf:[], //列设定
        tblDetailData:[] //明细数据行
    };
    //全局设定
    var settings={};

    //预览报表
    $.fn.displayReport=function(options){
        $.extend(settings,defaults,options);
        WZReport.init();
        WZReport.prepareTableData();
        WZReport.displayTable();
        WZReport.mergeCellByCol(0,0,0);
        WZReport.mergeCellByRow();
        WZReport.delHiddenCell();
    };

    var WZReport={
        //整合了合计行的数据列表
        lastTblData : [],
        //用于分组统计用的缓存数据
        //第0个元素为全数据统计，第1个元素为第1列（下标为0）的列的统计数据，以此类推
        //举例：需要根据A列和B列分别进行统计，则下标0的为全数据合计，下标1的为A列合计，下标2的为B列合计
        tmpFnDatas : [],
        //需要分组统计的最后一列的下标，为-1表示没有需要分组统计的列
        lastGroupColIdx : -1,
        //判断行数据分组是否变化
        isRowGroupChanged : function(rowIdx){
            for(var y=0;y<settings.tblDetailData[rowIdx].length;y++){
                if("G"==settings.tblConf[y].type){
                    if(settings.tblDetailData[rowIdx][y].val==settings.tblDetailData[rowIdx-1][y].val){
                        continue;
                    }else{
                        return y;
                    }
                }else{
                    return -1;
                }
            }
            return -1;
        },
        //判断对象是否为空（包括空字符串）
        isEmpty : function(o){
            if('undefined'==typeof(o) || null==o || ''==o){
                return true;
            }
            return false;
        },
        //初始化统计行缓存数据
        resetTmpFnDatas : function(idx){
            for(var x=idx+1;x<WZReport.tmpFnDatas.length;x++){
                WZReport.tmpFnDatas[x]=[];
            }
        },
        //累加合计行数据
        add : function(a,b){
            var aa,bb;
            if(WZReport.isEmpty(a)){
                aa=0;
            }else{
                aa=a;
            }
            if(WZReport.isEmpty(b)){
                bb=0;
            }else{
                bb=b;
            }
            return aa+bb;
        },
        //获取表格中某行某列的内容
        getTableByRowAndCol : function(tbid,r,c){
            return $("#"+tbid).find("tr").eq(r).find("td").eq(c).html();
        },
        //计算统计列
        setFnVal : function(fnData,x,y){
            if('sum'==settings.tblConf[y].fn){
                fnData[y]=WZReport.tmpFnDatas[x][y].sum;
            }else if('count'==settings.tblConf[y].fn){
                fnData[y]=WZReport.tmpFnDatas[x][y].count;
            }else if('max'==settings.tblConf[y].fn){
                fnData[y]=WZReport.tmpFnDatas[x][y].max;
            }else if('min'==settings.tblConf[y].fn){
                fnData[y]=WZReport.tmpFnDatas[x][y].min;
            }else if('avg'==settings.tblConf[y].fn){
                fnData[y]=(WZReport.tmpFnDatas[x][y].sum/WZReport.tmpFnDatas[x][y].count).toFixed(2);
            }else if(!WZReport.isEmpty(settings.tblConf[y].fn)){
                fnData[y]='计算值';
            }else{
                fnData[y]='';
            } 
        },
        //预览步骤一:初始化分组统计用缓存数据及需统计最后一列下标
        init : function(){
			//设置报表标题
			$("#"+settings.tblTitleId).html(settings.tblTitle);
			//将原有页面表格清空
			$("#"+settings.tblBodyId).html("");
            //增加全数据统计
            WZReport.tmpFnDatas.push([]);
            //每增加一个统计列增加一个缓存行
            for(var i=0;i<settings.tblConf.length;i++){
                if(settings.tblConf[i].type=='G'){
                    WZReport.tmpFnDatas.push([]);
                }else{
                    WZReport.lastGroupColIdx=i-1;
                    break;
                }
            }
        },
        //预览步骤二:对明细数据进行处理，计算并增加必要的统计行
        prepareTableData : function(){
            //整理分组合计列
            for(var i=0;i<settings.tblDetailData.length;i++){
                //增加一新行
                var tmpNewRow=[];
                //处理第一行数据
                if(0==i){
                    for(var j=0;j<settings.tblDetailData[i].length;j++){
                        //如果需要根据此列进行统计，则增加统计缓存行
                        if("G"==settings.tblConf[j].type){
                            tmpNewRow[j]=settings.tblDetailData[i][j].val;
                        }else{
                            tmpNewRow[j]=settings.tblDetailData[i][j].val;
                            //如果该行需要进行累加，则所有的合计行均进行累加
                            if(!WZReport.isEmpty(settings.tblConf[j].fn)){
                                for(var m=WZReport.tmpFnDatas.length-1;m>=0;m--){
                                    WZReport.tmpFnDatas[m][j]={};
                                    WZReport.tmpFnDatas[m][j].sum=settings.tblDetailData[i][j].val;
                                    WZReport.tmpFnDatas[m][j].count=1;
                                    WZReport.tmpFnDatas[m][j].max=settings.tblDetailData[i][j].val;
                                    WZReport.tmpFnDatas[m][j].min=settings.tblDetailData[i][j].val;
                                    WZReport.tmpFnDatas[m][j].avg=settings.tblDetailData[i][j].val;
                                }
                            }
                        }
                    }
                    WZReport.lastTblData.push(tmpNewRow);
                }else{
                    //该列数据产生变化
                    var changedGroupColIdx=WZReport.isRowGroupChanged(i);
                    //查询最后一个需要进行统计列的下标
                    if(0<=changedGroupColIdx){
                        //计算合计行
                        for(var v=WZReport.lastGroupColIdx;v>=changedGroupColIdx;v--){
                            var tmpFnRow=[];
                            for(var j=0;j<settings.tblDetailData[i].length;j++){
                                if(j==v){
                                    tmpFnRow[j]='小计'; 
                                }else{
                                    if("G"==settings.tblConf[j].type){
                                        if(j<v){
                                            tmpFnRow[j]=settings.tblDetailData[i-1][j].val;
                                        }else{
                                            tmpFnRow[j]='';
                                        }
                                    }else{
                                        if(WZReport.isEmpty(WZReport.tmpFnDatas[v+1][j])){
                                            tmpFnRow[j]='';
                                        }else{
                                            WZReport.setFnVal(tmpFnRow,v+1,j);
//                                            if('sum'==settings.tblConf[j].fn){
//                                                tmpFnRow[j]=WZReport.tmpFnDatas[v+1][j].sum;
//                                            }else if('count'==settings.tblConf[j].fn){
//                                                tmpFnRow[j]=WZReport.tmpFnDatas[v+1][j].count;
//                                            }else if('max'==settings.tblConf[j].fn){
//                                                tmpFnRow[j]=WZReport.tmpFnDatas[v+1][j].max;
//                                            }else if('min'==settings.tblConf[j].fn){
//                                                tmpFnRow[j]=WZReport.tmpFnDatas[v+1][j].min;
//                                            }else if('avg'==settings.tblConf[j].fn){
//                                                tmpFnRow[j]=(WZReport.tmpFnDatas[v+1][j].sum/WZReport.tmpFnDatas[v+1][j].count).toFixed(2);
//                                            }else if(!WZReport.isEmpty(settings.tblConf[j].fn)){
//                                                tmpFnRow[j]='计算值';
//                                            }else{
//                                                tmpFnRow[j]='';
//                                            }
                                        }
                                    }
                                }
                            }
                            WZReport.lastTblData.push(tmpFnRow);
                        }
                        //增加合计行后，该合计项及之后的合计项清空，准备下一次重新合计
                        WZReport.resetTmpFnDatas(changedGroupColIdx);
                    }
                    //计算非统计项
                    for(var j=0;j<settings.tblDetailData[i].length;j++){
                        tmpNewRow[j]=settings.tblDetailData[i][j].val;
                        for(var m=WZReport.tmpFnDatas.length-1;m>=0;m--){
                            if(WZReport.isEmpty(WZReport.tmpFnDatas[m][j])){
                                WZReport.tmpFnDatas[m][j]={};
                            }
                            WZReport.tmpFnDatas[m][j].sum=WZReport.add(WZReport.tmpFnDatas[m][j].sum,settings.tblDetailData[i][j].val);
                            WZReport.tmpFnDatas[m][j].count=WZReport.add(WZReport.tmpFnDatas[m][j].count,1);
                            WZReport.tmpFnDatas[m][j].max=(WZReport.tmpFnDatas[m][j].max<settings.tblDetailData[i][j].val)?settings.tblDetailData[i][j].val:WZReport.tmpFnDatas[m][j].max;
                            WZReport.tmpFnDatas[m][j].min=(WZReport.tmpFnDatas[m][j].min>settings.tblDetailData[i][j].val)?settings.tblDetailData[i][j].val:WZReport.tmpFnDatas[m][j].min;
                            WZReport.tmpFnDatas[m][j].avg=new Number((WZReport.tmpFnDatas[m][j].sum/WZReport.tmpFnDatas[m][j].count).toFixed(2));
                        }
                    }
                    WZReport.lastTblData.push(tmpNewRow);
                }
            }
            //计算最后的数据的合计及总合计
            for(var x=WZReport.tmpFnDatas.length-1;x>=0;x--){
                var tmpFnRow=[];
                if(0==x){
                    tmpFnRow[0]='总计';
                    for(var w=1;w<settings.tblDetailData[settings.tblDetailData.length-1].length;w++){
                        if("G"==settings.tblConf[w].type){
                            tmpFnRow[w]='';
                        }else{
                            if(WZReport.isEmpty(WZReport.tmpFnDatas[x][w])){
                                tmpFnRow[w]='';
                            }else{
                                WZReport.setFnVal(tmpFnRow,x,w);
//                                if('sum'==settings.tblConf[w].fn){
//                                    tmpFnRow[w]=WZReport.tmpFnDatas[x][w].sum;
//                                }else if('count'==settings.tblConf[w].fn){
//                                    tmpFnRow[w]=WZReport.tmpFnDatas[x][w].count;
//                                }else if('max'==settings.tblConf[w].fn){
//                                    tmpFnRow[w]=WZReport.tmpFnDatas[x][w].max;
//                                }else if('min'==settings.tblConf[w].fn){
//                                    tmpFnRow[w]=WZReport.tmpFnDatas[x][w].min;
//                                }else if('avg'==settings.tblConf[w].fn){
//                                    tmpFnRow[w]=(WZReport.tmpFnDatas[x][w].sum/WZReport.tmpFnDatas[x][w].count).toFixed(2);
//                                }else if(!WZReport.isEmpty(settings.tblConf[w].fn)){
//                                    tmpFnRow[w]='计算值';
//                                }else{
//                                    tmpFnRow[w]='';
//                                }
                            }
                        }
                    }
                }else{
                    for(var w=0;w<settings.tblDetailData[settings.tblDetailData.length-1].length;w++){
                        if(w==x-1){
                            tmpFnRow[w]='小计';
                        }else{
                            if("G"==settings.tblConf[w].type){
                                if(w<(x-1)){
                                    tmpFnRow[w]=settings.tblDetailData[settings.tblDetailData.length-1][w].val;
                                }else{
                                    tmpFnRow[w]='';
                                }
                            }else{
                                if(WZReport.isEmpty(WZReport.tmpFnDatas[x][w])){
                                    tmpFnRow[w]='';
                                }else{
                                    WZReport.setFnVal(tmpFnRow,x,w);
//                                    if('sum'==settings.tblConf[w].fn){
//                                        tmpFnRow[w]=WZReport.tmpFnDatas[x][w].sum;
//                                    }else if('count'==settings.tblConf[w].fn){
//                                        tmpFnRow[w]=WZReport.tmpFnDatas[x][w].count;
//                                    }else if('max'==settings.tblConf[w].fn){
//                                        tmpFnRow[w]=WZReport.tmpFnDatas[x][w].max;
//                                    }else if('min'==settings.tblConf[w].fn){
//                                        tmpFnRow[w]=WZReport.tmpFnDatas[x][w].min;
//                                    }else if('avg'==settings.tblConf[w].fn){
//                                        tmpFnRow[w]=(WZReport.tmpFnDatas[x][w].sum/WZReport.tmpFnDatas[x][w].count).toFixed(2);
//                                    }else if(!WZReport.isEmpty(settings.tblConf[w].fn)){
//                                        tmpFnRow[w]='计算值';
//                                    }else{
//                                        tmpFnRow[w]='';
//                                    }
                                }
                            }
                        }
                    }
                }
                WZReport.lastTblData.push(tmpFnRow);
            }
        },
        //预览步骤三:显示数据表格
        displayTable : function(){
            var tblStr='';
            for(var i=0;i<WZReport.lastTblData.length;i++){
                tblStr+='<tr>';
                for(var j=0;j<WZReport.lastTblData[i].length;j++){
                    tblStr+='<td>'+WZReport.lastTblData[i][j]+'</td>';
                }
                tblStr+='</tr>';
            }
            $("#"+settings.tblBodyId).html(tblStr);
        },
        //预览步骤四:根据列合并相同数据的单元格(纵向合并)
        mergeCellByCol : function(startRow,endRow,col){
            if(col>=settings.tblConf.length){
                return;
            }
            //当检查第0列时检查所有行
            if (col==0 || endRow==0) {
                endRow=$("#"+settings.tblBodyId).find("tr").length-1;
            }
            for(var i=startRow;i<endRow;i++){
                //程序是自左向右合并
                if (!WZReport.isEmpty(WZReport.getTableByRowAndCol(settings.tblBodyId,i+1,col))
                        && settings.tblConf[col].merge
                        && (WZReport.getTableByRowAndCol(settings.tblBodyId,startRow,col)== WZReport.getTableByRowAndCol(settings.tblBodyId,i+1,col))){
                    //如果相同则删除下一行的第0列单元格
                    $("#"+settings.tblBodyId).find("tr").eq(i+1).find("td").eq(col).css("display",'none');
                    //更新rowSpan属性
                    var tdMd=$("#"+settings.tblBodyId).find("tr").eq(startRow).find("td").eq(col);
                    var tdMdRowspan=tdMd.attr("rowspan");
                    if('undefined'==typeof(tdMdRowspan)){
                        tdMdRowspan=1;
                    }
                    tdMd.attr("rowspan",(tdMdRowspan|0)+1);
                    //当循环到终止行前一行并且起始行和终止行不相同时递归(因为上面的代码已经检查了i+1行，所以此处只到endRow-1)  
                    if (i==endRow-1 && startRow!=endRow) {  
                        WZReport.mergeCellByCol(startRow,endRow,col+1);  
                    }  
                } else {  
                    //起始行，终止行不变，检查下一列  
                    WZReport.mergeCellByCol(startRow,i,col+1);  
                    //增加起始行  
                    startRow=i+1;  
                }  
            }
        },
        //预览步骤四:根据行合并相同数据的单元格(横向合并)
        mergeCellByRow : function(){
            var rl=$("#"+settings.tblBodyId).find("tr").length;
            var cl;
            for(var i=0;i<rl;i++){
                cl=$("#"+settings.tblBodyId).find("tr").eq(i).find("td").length;
                for(var j=0;j<cl;j++){
                    if('小计'==WZReport.getTableByRowAndCol(settings.tblBodyId,i,j)
                            || '总计'==WZReport.getTableByRowAndCol(settings.tblBodyId,i,j)){
                        for(var k=j+1;k<=WZReport.lastGroupColIdx;k++){
                            $("#"+settings.tblBodyId).find("tr").eq(i).find("td").eq(k).css("display",'none');
                            var tdMd=$("#"+settings.tblBodyId).find("tr").eq(i).find("td").eq(j);
                            var tdMdColspan=tdMd.attr("colspan");
                            if('undefined'==typeof(tdMdColspan)){
                                tdMdColspan=1;
                            }
                            tdMd.attr("colspan",(tdMdColspan|0)+1);
                        }
                    }
                }
            }
        },
        //预览步骤五:删除所有隐藏列
        delHiddenCell : function(){
            var rl=$("#"+settings.tblBodyId).find("tr").length;
            var cl;
            for(var i=0;i<rl;i++){
                cl=$("#"+settings.tblBodyId).find("tr").eq(i).find("td").length;
                for(var j=cl-1;j>=0;j--){
                    if('none'==$("#"+settings.tblBodyId).find("tr").eq(i).find("td").eq(j).css("display")){
                        $("#"+settings.tblBodyId).find("tr").eq(i).find("td").eq(j).remove();
                    }
                }
            }
        }
    };
})(jQuery);
