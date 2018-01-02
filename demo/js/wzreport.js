/**
 * 报表表格展示
 */
//准备表格数据
function prepareData(colConf,data){
    //最终的数据行
    var tblDatas=[];
    //合计行数据
    //第0个元素为总合计，第1个元素为第1列（下标为0）的列的合计数据
    var tmpSumDatas=[];
    tmpSumDatas.push([]);
    //整理分组合计列
    for(var i=0;i<data.length;i++){
        //增加一新行
        var newRow=[];
        //处理第一行数据
        if(0==i){
            for(var j=0;j<data[i].length;j++){
                //如果需要根据此列进行统计，则增加统计缓存行
                if("G"==colConf[j].typ){
                    newRow[j]=data[i][j].val;
                    tmpSumDatas.push([]);
                }else{
                    newRow[j]=data[i][j].val;
                    //如果该行需要进行累加，则所有的合计行均进行累加
                    if(true==colConf[j].needSum){
                        for(var m=tmpSumDatas.length-1;m>=0;m--){
                            tmpSumDatas[m][j]=data[i][j].val;
                        }
                    }
                }
            }
            tblDatas.push(newRow);
        }else{
            //该列数据产生变化
            var changedIdx=isRowChanged(data,colConf,i);
            //查询最后一个需要进行统计列的下标
            var lastIdx=lastGroupColIdx(colConf);
            if(0<=changedIdx){
                //计算合计行
                for(var v=lastIdx;v>=changedIdx;v--){
                    var sumRowForDetail=[];
                    for(var j=0;j<data[i].length;j++){
                        if(j==v){
                            sumRowForDetail[j]='小计'; 
                        }else{
                            if("G"==colConf[j].typ){
                                if(j<v){
                                    sumRowForDetail[j]=data[i-1][j].val;
                                }else{
                                    sumRowForDetail[j]='';
                                }
                            }else{
                                if(true==colConf[j].needSum && 'undefined'!=typeof(tmpSumDatas[v+1][j])){
                                    sumRowForDetail[j]=tmpSumDatas[v+1][j];
                                }else{
                                    sumRowForDetail[j]='';
                                }
                            }
                        }
                    }
                    tblDatas.push(sumRowForDetail);
                }
                //增加合计行后，该合计项及之后的合计项清空，准备下一次重新合计
                initTmpSumRow(changedIdx,tmpSumDatas);
            }
            //计算非统计项
            for(var j=0;j<data[i].length;j++){
                newRow[j]=data[i][j].val;
                if(true==colConf[j].needSum){
                    for(var m=tmpSumDatas.length-1;m>=0;m--){
                        tmpSumDatas[m][j]=add(tmpSumDatas[m][j],data[i][j].val);
                    }
                }
            }
            tblDatas.push(newRow);
        }
    }
    //计算最后的数据的合计及总合计
    for(var x=tmpSumDatas.length-1;x>=0;x--){
        var sumRowForDetail=[];
        if(0==x){
            sumRowForDetail[0]='总计';
            for(var w=1;w<data[data.length-1].length;w++){
                if("G"==colConf[w].typ){
                    sumRowForDetail[w]='';
                }else{
                    if(true==colConf[w].needSum && 'undefined'!=typeof(tmpSumDatas[x][w])){
                        sumRowForDetail[w]=tmpSumDatas[x][w];
                    }else{
                        sumRowForDetail[w]='';
                    }
                }
            }
        }else{
            for(var w=0;w<data[data.length-1].length;w++){
                if(w==x-1){
                    sumRowForDetail[w]='小计';
                }else{
                    if("G"==colConf[w].typ){
                        if(w<(x-1)){
                            sumRowForDetail[w]=data[data.length-1][w].val;
                        }else{
                            sumRowForDetail[w]='';
                        }
                    }else{
                        if(true==colConf[w].needSum && 'undefined'!=typeof(tmpSumDatas[x][w])){
                            sumRowForDetail[w]=tmpSumDatas[x][w];
                        }else{
                            sumRowForDetail[w]='';
                        }
                    }
                }
            }
        }
        tblDatas.push(sumRowForDetail);
    }
    return tblDatas;
}
//显示数据表格
function showTable(data,conf){
    var lgci=lastGroupColIdx(conf);
    var tblStr='';
    for(var i=0;i<data.length;i++){
        tblStr+='<tr>';
        for(var j=0;j<data[i].length;j++){
            if('小计'==data[i][j] || '总计'==data[i][j]){
                tblStr+='<td colspan="'+(lgci-j+1)+'">'+data[i][j]+'</td>';
                j=lgci;
            }else{
                tblStr+='<td>'+data[i][j]+'</td>';
            }
        }
        tblStr+='</tr>';
    }
    $("#tblBody").html(tblStr);
}
//根据列合并相同数据的单元格
function mergeCell(tblId,startRow,endRow,col,conf){
    var lgci=lastGroupColIdx(conf);
    var tb = document.getElementById(tblId);  
    if (col > lgci) {  
        return;  
    }  
    //当检查第0列时检查所有行  
    if (col == 0 || endRow == 0) {  
        endRow = tb.rows.length - 1;  
    }  
    for (var i = startRow; i < endRow; i++) {  
        //程序是自左向右合并  
        if (tb.rows[startRow].cells[col].innerHTML == tb.rows[i + 1].cells[col].innerHTML) {  
            //如果相同则删除下一行的第0列单元格  
            tb.rows[i + 1].cells[col].style.display='none';  
            //更新rowSpan属性  
            tb.rows[startRow].cells[col].rowSpan = (tb.rows[startRow].cells[col].rowSpan | 0) + 1;  
            //当循环到终止行前一行并且起始行和终止行不相同时递归(因为上面的代码已经检查了i+1行，所以此处只到endRow-1)  
            if (i == endRow - 1 && startRow != endRow) {  
                mergeCell(tblId,startRow,endRow,col+1,conf);  
            }  
        } else {  
            //起始行，终止行不变，检查下一列  
            mergeCell(tblId,startRow,i,col+1,conf);  
            //增加起始行  
            startRow = i + 1;  
        }  
    }
}
//查找最后需要合并的列的下标
function lastGroupColIdx(conf){
    for(var z=0;z<conf.length;z++){
        if("G"==conf[z].typ){
            continue;
        }else{
            return z-1;
        }
    }
    return -1;
}
//判断行数据是否变化
function isRowChanged(data,conf,idx){
    for(var z=0;z<data[idx].length;z++){
        if("G"==conf[z].typ){
            if(data[idx][z].val==data[idx-1][z].val){
                continue;
            }else{
                return z;
            }
        }else{
            return -1;
        }
    }
    return -1;
}
//初始化统计行缓存数据
function initTmpSumRow(idx,data){
    for(var y=idx+1;y<data.length;y++){
        data[y]=[];
    }
}
//累加合计行数据
function add(a,b){
    var aa,bb;
    if('undefined'==typeof(a)||null==a){
        aa=0;
    }else{
        aa=a;
    }
    if('undefined'==typeof(b)||null==b){
        bb=0;
    }else{
        bb=b;
    }
    return aa+bb;
}