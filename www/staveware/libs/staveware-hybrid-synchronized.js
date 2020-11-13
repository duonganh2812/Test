/**
 * @(#)staveware-hybrid-synchronized.js
 * (C)Copyright 2018 Toshiba Digital Solutions Corporation
 *
 * Synchronize function.
 */

/**
 * Constructs a new StvSync object.<br>
 * @class
 * @classdesc This class is used to synchronize function.
 *
 * @version Staveware Mobile for Hybrid Ver.4.0
 * @return a new StvSync instance
 */

var StvSync = (function () {

    /**
    * @init Log function
    */
    var log = StvLogFactory.getLogger(StvLog.LOG_NAME);

    /**
     * @Is sync function check execute two time?
     */
    var isCompleted = false;

    /**
     * Constructor. This should not be used.
     * @constructor StvSync
     */
    var StvSync = function StvSync() { };

    /**
     * @constructor of localDAO
     */
    var StvDao = new StvDAO('metadata/staveware-dbmap',  'metadata/staveware-sqlmap');

    /**
     * @summary Initialization database metadata
     * @function initializeMetadata
     * @static
     *
     * @param {StvDAO} stvdao
     * Name of account
     * @param {function} callbackSuccess
     * function was called after initialization metadata success
     * @param {function} callbackError
     * function was called after initialization metadata error
     */
    StvSync.initializeMetadata = function (userData, callbackSuccess, callbackError) {
        StvDao.openDatabase("MetadataDB");
        // Delete Metadata before
        StvDao.transaction(function (trans) {
            trans.sql("deleteSyncData", null, null, null);
            trans.sql("deleteRevision", null, null, null);
        }, function errorCB(res) {
            log.info("Error delete table/trigger of Metadata DB:" + JSON.stringify(res));
        }, function successCB() {
            log.info("Delete table/trigger of Metadata DB successful.");
        });

        // Create table for Metadata
        StvDao.transaction(function (trans) {
            trans.sql("createRevision", null, null, null);
            trans.sql("createSyncData", null, null, null);
        }, function errorCB(res) {
            log.info("Error create table of Metadata DB:" + JSON.stringify(res));
        }, function successCB() {
            log.info("Create table of Metadata DB successful.");
        });

        // Create the device info table.
        StvDao.transaction(function (trans) {
            var revisionId = 0;
            var insertQuery = "INSERT INTO REVISION (createBy, revisionId) VALUES (" +
                "'" + userData + "', " + revisionId + ")";

            log.info("insertQuery: " + insertQuery);
            trans.sqlExe(insertQuery, null, null, null);

        }, function errorCB(res) {
            log.info("Error create revision table:" + JSON.stringify(res));
            callbackError(res)
        }, function successCB() {
            log.info("Create revision table successful.");
            callbackSuccess();
        });
    };

    /**
     * @summary Create trigger update when client execute update record
     * @function triggerUpdate
     * @static
     *
     * @param {Object} dataUpdate
     *  data when client execute update record
     * @param {String} config
     *  Object contain information in config sync file
     * @param {String} userData
     *  Name of account execute update record
     * @param {String} tableName
     *  Name of table is executed update
     */
    StvSync.triggerUpdate = function (dataUpdate, config, userData, tableName) {
        log.info("Update table sync_data");
        log.info("Task ID:" + JSON.stringify(dataUpdate));

        var tableSync = {
            "tableName": tableName,
            "tablePK": combinePK(dataUpdate, config, tableName)
        };
        log.info("tablePK: " + tableSync.tablePK);
        StvDao.transaction(function (trans) {
            var sql  = "SELECT * FROM SYNC_DATA WHERE tableName = '"+tableSync.tableName+"' AND tablePK ='"+tableSync.tablePK+"' AND latestUpdateBy is null";
            log.info("Query trigger update:"+sql);
            trans.sqlExe(sql,[],function(tx, result){
                var len = result.rows.length;
                var query = "";
                var getRevisionId = "SELECT revisionId FROM REVISION";
                tx.sqlExe(getRevisionId, [], function(tx1, results){
                    var revisionId = results.rows.item(0).revisionId;
                    console.log("revision id:"+ revisionId);
                    if(len == 0){
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                        query = "INSERT INTO SYNC_DATA (tableName, tablePK, createBy, createTime, latestUpdateBy, latestUpdateTime, isDeleted, revision) " +
                            "VALUES ('" + tableSync.tableName + "','" + tableSync.tablePK + "','" + userData + "', DATETIME('NOW'), '" + userData + "', DATETIME('NOW'), 0,"+revisionId+")";
                        tx1.sqlExe(query, [], null, null);
                    }else{
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                        query = "INSERT INTO SYNC_DATA (tableName, tablePK, createBy, createTime, latestUpdateBy, latestUpdateTime, isDeleted, revision) " +
                            "VALUES ('" + tableSync.tableName + "', '" + tableSync.tablePK + "', '" + userData + "', DATETIME('NOW'), null, null, 0, "+revisionId+")";
                        tx1.sqlExe(query, [], null, null);
                    }
                })
            });

        }, function errorCB() {
            log.info("Error trigger update");
        }, function successCB() {
            log.info("Success trigger update");
        });
    };

    /**
     * @summary Create trigger insert when client execute insert record
     * @function triggerInsert
     * @static
     *
     * @param {Object} dataInsert
     *  data when client execute insert record
     * @param {String} config
     *  Object contain information in config sync file
     * @param {String} userData
     *  Name of account execute insert record
     * @param {String} tableName
     *  Name of table is executed insert
     */
    StvSync.triggerInsert = function (dataInsert, config, userData, tableName) {
        log.info("Update table sync_data");
        log.info("Task ID:" + JSON.stringify(dataInsert));

        var tableSync = {
            "tableName": tableName,
            "tablePK": combinePK(dataInsert, config, tableName)
        };
        log.info("tablePK: " + tableSync.tablePK);
        StvDao.transaction(function (trans) {
            var sql  = "SELECT * FROM SYNC_DATA WHERE tableName = '"+tableSync.tableName+"' AND tablePK ='"+tableSync.tablePK+"' AND isDeleted = 1";
            log.info("Query trigger update:"+sql);
            trans.sqlExe(sql,[],function(tx, result){
                var len = result.rows.length;
                var query = "";
                var getRevisionId = "SELECT revisionId FROM REVISION";
                tx.sqlExe(getRevisionId, [], function(tx1, results){
                    var revisionId = results.rows.item(0).revisionId;
                    if(len != 0){
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                        query = "INSERT INTO SYNC_DATA (tableName, tablePK, createBy, createTime, latestUpdateBy, latestUpdateTime, isDeleted, revision) " +
                            "VALUES ('" + tableSync.tableName + "', '" + tableSync.tablePK + "', '" + userData + "', DATETIME('NOW'), '" + userData + "', DATETIME('NOW'), 0,"+revisionId+")";
                        tx1.sqlExe(query, [], null, null);
                    }else{
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                        query = "INSERT INTO SYNC_DATA (tableName, tablePK, createBy, createTime, latestUpdateBy, latestUpdateTime, isDeleted, revision) " +
                            "VALUES ('" + tableSync.tableName + "', '" + tableSync.tablePK + "', '" + userData + "', DATETIME('NOW'), null, null, 0,"+revisionId+")";
                        tx1.sqlExe(query, [], null, null);
                    }
                })
            });

        }, function errorCB() {
            log.info("Error trigger insert");
        }, function successCB() {
            log.info("Success trigger insert");
        });
    };

    /**
     * @summary Create trigger delete when client execute delete record
     * @function triggerDelete
     * @static
     *
     * @param {Object} data
     *  data when client execute delete record
     * @param {String} config
     *  Object contain information in config sync file
     * @param {String} userData
     *  Name of account execute delete record
     * @param {String} tableName
     *  Name of table is executed delete
     */
    StvSync.triggerDelete = function (dataDelete, config, userData, tableName) {
        log.info("Update table sync_data");
        log.info("Task ID:" + JSON.stringify(dataDelete));

        var tableSync = {
            "tableName": tableName,
            "tablePK": combinePK(dataDelete, config, tableName)
        };
        log.info("tablePK" + tableSync.tablePK);
        StvDao.transaction(function (trans) {
            var sql  = "SELECT * FROM SYNC_DATA WHERE tableName = '"+tableSync.tableName+"' AND tablePK ='"+tableSync.tablePK+"' AND latestUpdateBy is null";
            log.info("Query trigger update:"+sql);
            trans.sqlExe(sql,[],function(tx, result){
                var len = result.rows.length;
                var getRevisionId = "SELECT revisionId FROM REVISION";
                tx.sqlExe(getRevisionId, [], function(tx1, results){
                    var revisionId = results.rows.item(0).revisionId;
                    if(len == 0){
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                        var query = "INSERT INTO SYNC_DATA (tableName, tablePK, createBy, createTime, latestUpdateBy, latestUpdateTime, isDeleted, revision) " +
                            "VALUES ('" + tableSync.tableName + "','" + tableSync.tablePK + "','" + userData + "', DATETIME('NOW'), '" + userData + "', DATETIME('NOW'), 1,"+revisionId+")";
                        tx1.sqlExe(query, [], null, null);
                    }else{
                        tx1.deleteSQL("deleteASync", [tableSync.tableName, tableSync.tablePK], null, null);
                    }
                })
            });

        }, function errorCB() {
            log.info("Error trigger delete");
        }, function successCB() {
            log.info("Success trigger delete");
        });
    };

    /**
     * @summary Combine multi key of table
     * @function combinePK
     *
     * @param {Object} data
     *  data when client execute the change record
     * @param {String} config
     *  Object contain information in config sync file
     * @param {String} tableName
     *  Name of table is executed the change record
     * @return {String} combine multi key
     */
    var combinePK = function (data, config, tableName) {
        if((data != undefined)&&(JSON.stringify(data).length >2) && (data !== null)){
            if((tableName !== "") && (tableName !== null) && (tableName != undefined)){
                if((config != undefined)&&(JSON.stringify(config).length >2) && (config !== null)){
                    var tablePK = "";
                    log.info("Show config name:"+config[tableName]);
                    if(config[tableName] != null){
                        var src = config[tableName].split(",");
                        for(var  i = 0; i<src.length; i++){
                            if(data[src[i]] != null){
                                tablePK = tablePK+data[src[i]]+",";
                            }else{
                                throw new IllegalArgumentException("data,config,tableName is wrong")
                            }
                        }
                    }else{
                        throw new IllegalArgumentException("data,config,tableName is wrong")
                    }    
                    tablePK = tablePK.substring(0, tablePK.length - 1);
                    log.info("tablePK:" + tablePK);
                    return tablePK;
                }else{
                    throw new IllegalArgumentException("config must not null or empty or undefined")
                }
            }else{
                throw new IllegalArgumentException("tableName must not null or empty or undefined")
            }
        }else{
            throw new IllegalArgumentException("data must not null or empty or undefined")
        }
    };

    /**
     * @summary Send data to server
     * @function sendDataToServer
     * @static
     *
     * @param {String} serverUrl
     *  Server url
     * @param {Object} dataToServer
     *  data is sent to server
     * @param {function} callback
     *  function is executed when client receive data returned from server
     */
    StvSync.sendDataToServer = function (serverUrl, dataToServer,objNotWhere, callback) {
        if((serverUrl !== "") && (serverUrl !== null) && (serverUrl != undefined)){
            if((dataToServer != undefined)&&(JSON.stringify(dataToServer).length >2) && (dataToServer !== null)){
                if((objNotWhere != undefined)&& (objNotWhere !== null)){
                    log.info("Send data to Server:" + serverUrl);
                    log.info(JSON.stringify(dataToServer))
                    var dataJSON = JSON.stringify(dataToServer);

                    $.ajax({
                        dataType: "json",
                        contentType: "application/json; charset=UTF-8",
                        method: "POST",
                        url: serverUrl,
                        async: true,
                        data: dataJSON,
                        success: function (data, status, xhr) {
                            log.info("Send ajax successfully");
                            log.info("Data:" + JSON.stringify(data));
                            log.info("Status:" + JSON.stringify(status));
                            log.info("XHR:" + JSON.stringify(xhr));
                            var serverData;
                            try {
                                serverData = JSON.parse(data);
                            } catch (e) {
                                serverData = data;
                            }
                            log.info("Server data return:" + JSON.stringify(serverData));
                            callback(serverData, objNotWhere);

                        },
                        error: function (xhr, status, error) {
                            log.info("Send ajax failure.");
                            log.info("XHR:" + JSON.stringify(xhr));
                            log.info("Status:" + JSON.stringify(status));
                            log.info("Error:" + JSON.stringify(error));
                            throw new IllegalArgumentException("serverUrl is wrong")
                        }
                        
                    });
                }else{
                    throw new IllegalArgumentException("objNotWhere must not null or undefined")
                }
            }else{
                throw new IllegalArgumentException("dataToServer must not null or empty or undefined")
            }
        }else{
            throw new IllegalArgumentException("serverUrl must not null or empty or undefined")
        }
    };

    /**
     * @summary create where clause to getmetadata, getlocalData and delete metadata
     * @function getWhereList
     *
     * @param {Object} whereList
     *  List of object contain primary key of local database
     * @param {String} config
     *  Object contain information in config sync file
     * @param {Array} listTable
     *  List table want to synchronize
     * @return {String} Where clause to getmetadata, getlocalData and delete metadata
     */
    var getWhereList = function (whereList, config, listTable) {
        if((whereList != undefined) && (whereList !== null)){
            if((listTable != undefined)&&(listTable.length >0) && (listTable !== null)){
                log.info("GET WHERE LIST:" + JSON.stringify(whereList));
                var sql = "";
                if(Object.keys(whereList).length > 0){
                    for (var j = 0; j < listTable.length; j++) {
                        if(whereList[listTable[j]] != null){
                            var len = whereList[listTable[j]].length;
                            for (var i = 0; i < len; i++) {
                                var temp = combinePK(whereList[listTable[j]][i], config, listTable[j]);
                                log.info("Temp in where list:" + temp);
                                sql = sql + "'" + temp + "',";
                            }
                        }else{
                            throw new IllegalArgumentException("whereList and listtable is wrong");
                        }
                    }
                }else{
                    return sql;
                }
                if(sql == ""){
                    return sql;
                }
                sql = sql.substring(0, sql.length - 1);
                sql = "(" + sql + ")";
                return sql;
            }else{
                throw new IllegalArgumentException("listTable must not null or empty or undefined")
            }
        }else{
            throw new IllegalArgumentException("whereList must not empty or undefined")
        }
    };

    /**
     * @summary Get metadata
     * @function getMetadata
     * @static
     *
     * @param {Object} tableList
     *  contain list of table synchronized and user create record
     * @param {Object} whereList
     *  condition getmetadata, contain primary key of table synchornized
     * @param {String} config
     *  Object contain information in config sync file
     * @param {function} callback
     *  function is executed after getting metadata
     */
    StvSync.getMetadata = function (tableList, whereList, config, callback) {
        log.info("Get metadata in Library");
        var listTable = tableList["tableName"].split(",");
        var whereSQL = getWhereList(whereList, config, listTable);
        var createBy = tableList["createBy"];
        log.info("where list:" + whereSQL);
        StvDao.transaction(function (trans) {
            // Get device info data.
            trans.selectSQL("selectRevision", [createBy], function (tx, results) {
                log.info("Device info result:" + JSON.stringify(results));
                var len = results.rows.length;

                for (var i = 0; i < len; i++) {
                    var Revision = {};
                    Revision.createBy = results.rows.item(i).createBy;
                    Revision.revisionId = results.rows.item(i).revisionId;
                }
                var getMeta = "SELECT * FROM SYNC_DATA";
                if (whereSQL != "") {
                    getMeta = getMeta + " WHERE tablePK IN " + whereSQL;
                } else {
                    log.info("No where clause");
                }
                log.info("SQL get metadata:" + getMeta);
                tx.sqlExe(getMeta, [], function (tx1, results) {
                    //                tx.selectSQL("selectAllMetadata", [], function (tx1, results) {
                    log.info("Metadata result:" + JSON.stringify(results));
                    var len = results.rows.length;
                    var metadataListInWhere = [];
                    log.info("Get metadata in SyncView with result:" + JSON.stringify(results));
                    for (var i = 0; i < len; i++) {
                        var metadataItem = {};
                        metadataItem.tableName = results.rows.item(i).tableName;
                        metadataItem.tablePK = results.rows.item(i).tablePK;
                        metadataItem.createBy = results.rows.item(i).createBy;
                        metadataItem.createTime = results.rows.item(i).createTime;
                        metadataItem.lastUpdateBy = results.rows.item(i).latestUpdateBy;
                        metadataItem.lastUpdateTime = results.rows.item(i).latestUpdateTime;
                        metadataItem.isDeleted = results.rows.item(i).isDeleted;
                        metadataItem.revision = results.rows.item(i).revision;

                        metadataListInWhere.push(metadataItem);
                    }
                    log.info("Revision info:" + JSON.stringify(Revision));

                    log.info("MetadataList in where:" + JSON.stringify(metadataListInWhere));

                    
                    var objNotWhere = {};
                    var getMetaNotInWhere = "";
                    if (whereSQL != "") {
                        getMetaNotInWhere = "SELECT * FROM SYNC_DATA WHERE tablePK NOT IN " + whereSQL;
                        tx1.sqlExe(getMetaNotInWhere, [], function(tx2, resultNotWhere){
                            var lenNotWhere = resultNotWhere.rows.length;
                            var  metadataListNotInWhere = [];
                            log.info("Metadata not where result:" + JSON.stringify(resultNotWhere));
                            for(var j = 0; j< lenNotWhere; j++){
                                var metadataItemNotWhere = {};
                                metadataItemNotWhere.tableName = resultNotWhere.rows.item(j).tableName;
                                metadataItemNotWhere.tablePK = resultNotWhere.rows.item(j).tablePK;
                                metadataListNotInWhere.push(metadataItemNotWhere);
                            }
                            log.info("MetadataList not in where:" + JSON.stringify(metadataListNotInWhere));
                            objNotWhere = createObject(metadataListNotInWhere,listTable,config);
                            
                            log.info("MetadataList not in where:" + JSON.stringify(objNotWhere));
                            callback(metadataListInWhere, Revision, objNotWhere);
                        })
                    }else{
                        callback(metadataListInWhere, Revision, objNotWhere);
                    }
                    
                });
            });
        }, null, null);
    };



     /**
     * @summary convert from list to object
     * @function createObject
     * @static
     *
     * @param {Array} metadataListNotInWhere
     *  Contain list object metadata not in where clause
     * @param {Array} listTable
     *  List of table synchronized
     * @param {String} config
     *  Object contain information in config sync file
     * @return {Object} return object contain table and primakey of this table
     */   
    var createObject = function(metadataListNotInWhere, listTable, config){
        if(metadataListNotInWhere != null && metadataListNotInWhere != undefined){
            var len = metadataListNotInWhere.length;
            var obj = {}
            for(var i = 0; i<listTable.length; i++){
                var listObj = [];
                for(var j = 0; j<len; j++){
                    if(metadataListNotInWhere[j].tableName == listTable[i]){
                        var objNotWhere = {};
                        var key = config[listTable[i]].split(",");
                        var valueOfKey = metadataListNotInWhere[j].tablePK.split(",");
                        for(var k = 0; k< key.length; k++){
                            objNotWhere[key[k]] = valueOfKey[k];
                        }
                        listObj.push(objNotWhere);
                    }
                }
                obj[listTable[i]] = listObj;
            }
            return obj;
        }else{
            throw new IllegalArgumentException("metadataListNotInWhere must not undefined")
        }
    } 
    /**
     * @summary execute delete metadata after synchronize completed
     * @function afterSync
     * @static
     *
     * @param {String} config
     *  Object contain information in config sync file
     * @param {Object} responseData
     * data is received from server
     * @param {Object} tableList
     *  contain list of table synchronized and user create record
     * @param {Array} whereList
     *  condition getmetadata, contain primary key of table synchornized
     * @param {function} callback
     *  function is executed after delete metadata
     */

    StvSync.afterSync = function (config, responseData, tableList, whereList, callback) {
        var _metadataList = [];
        var listTable = tableList["tableName"].split(",");
        var where = getWhereList(whereList, config, listTable);
        log.info("_metadataList: " + JSON.stringify(_metadataList));
        StvDao.transaction(function (trans) {
            trans.selectSQL("selectAllMetadata", [], function (tx, results) {
                log.info("Metadata result:" + JSON.stringify(results));
                var len = results.rows.length;
                var metadataList = [];

                log.info("Get metadata in SyncView with result:" + JSON.stringify(results));

                for (var i = 0; i < len; i++) {
                    var metadataItem = {};
                    metadataItem.tableName = results.rows.item(i).tableName;
                    metadataItem.tablePK = results.rows.item(i).tablePK;
                    metadataItem.createBy = results.rows.item(i).createBy;
                    metadataItem.createTime = results.rows.item(i).createTime;
                    metadataItem.lastUpdateBy = results.rows.item(i).latestUpdateBy;
                    metadataItem.lastUpdateTime = results.rows.item(i).latestUpdateTime;
                    metadataItem.isDeleted = results.rows.item(i).isDeleted;
                    metadataItem.revision = results.rows.item(i).revision;
                    metadataList.push(metadataItem);
                }
                log.info("MetadataList:" + JSON.stringify(metadataList));
            });
            for (var i = 0; i < listTable.length; i++) {
                if (isCompleted == true) {
                    isCompleted = false;
                    var deleteSQL = "";
                    if(where != ""){
                    deleteSQL = "DELETE FROM SYNC_DATA WHERE tablePK IN " + where;
                    }else{
                        deleteSQL = "DELETE FROM SYNC_DATA"
                    }
                    log.info("Delete sync_data after sync:" + deleteSQL);
                    trans.sqlExe(deleteSQL, [], null, null);
                }
                if (responseData) {
                    var listDel = []
                    var listCombinePK = [];
                    if(whereList[listTable[i]]){
                        listDel = whereList[listTable[i]];
                    }
                    for(var j = 0; j<listDel.length; j++){
                        listCombinePK.push(combinePK(listDel[j],config,listTable[i]));
                    }
                    var serverMetadataList = [];
                    log.info("Do delete metadata by server response data");
                    log.info("Data respone in after sync:" + JSON.stringify(responseData));
                    var deleteData = responseData["deletedData"];
                    var k = 0;
                    if (deleteData) {
                        for (k = 0; k < deleteData.length; k++) {
                            var check = false;
                            for(var j= 0; j<listCombinePK.length; j++){
                                if(deleteData[k]["tablePK"] == listCombinePK[j]){
                                    check = true;
                                }
                            }
                            if(check == true){
                                serverMetadataList.push("'" + deleteData[k]["tablePK"] + "'");
                            }
                        }
                    }
                    var insertData = responseData["insertedData"][listTable[i]];
                    log.info("Log insert in after sync:" + JSON.stringify(insertData));

                    if (insertData) {
                        for (k = 0; k < insertData.length; k++) {
                            if(insertData[k]){
                                var key = combinePK(insertData[k], config, listTable[i]);
                                var check = false;
                                for(var j= 0; j<listCombinePK.length; j++){
                                    if(key == listCombinePK[j]){
                                        check = true;
                                    }
                                }
                                if(check == true){
                                    serverMetadataList.push("'" + key + "'");
                                }
                                
                            }
                        }
                        log.info("Log insert in after sync:" + JSON.stringify(serverMetadataList));
                    }
                    var updateData = responseData["updatedData"][listTable[i]];
                    if (updateData) {
                        for (k = 0; k < updateData.length; k++) {
                            if(updateData[k]){
                                var keyPK = combinePK(updateData[k], config, listTable[i]);
                                var check = false;
                                for(var j= 0; j<listCombinePK.length; j++){
                                    if(keyPK == listCombinePK[j]){
                                        check = true;
                                    }
                                }
                                if(check == true){
                                    serverMetadataList.push("'" + keyPK + "'");
                                }
                            }
                        }
                    }
                    if (serverMetadataList.length > 0) {
                        var strServerMetadataList = serverMetadataList.toString();
                        var deleteSQLRespone = "DELETE FROM SYNC_DATA WHERE tableName = " + "'" + listTable[i] + "'" + " AND tablePK IN (" + strServerMetadataList + ")";
                        log.info("Delete sync_data afterSync:" + deleteSQLRespone);
                        trans.sqlExe(deleteSQLRespone, [], null, null);
                    }
                }
            }
        }, null, callback);
    };

    /**
     * @summary Condition to execute get data in local
     * @function getLocalData
     * @static
     *
     * @param {Object} listMetadata
     *  data of metadata contain sync_data table
     * @param {Object} revisionInfo
     *  data of revision contain create by and revisionId in revision table
     * @param {String} config
     *  Object contain information in config sync file
     * @param {Object} tableList
     *  contain list of table synchronized and user create record
     * @param {String} url
     *  directory path to send to server
     * @param {Array} whereList
     *  condition to get metadata
     * @param {function} callback
     *  function is executed after getLD function execute
     * @param {function} getLocalDataInApp
     *  function is executed after getLocalData
     */
    StvSync.getLocalData = function (listMetadata, revisionInfo, config, tableList, url, whereList, callback, getLocalDataInApp) {
        var _totalSyncData = 0;
        var localDataSync = {};
        var tableNameItem = tableList["tableName"];
        var listTable = tableList["tableName"].split(",");
        var listQueryInsert = [];
        var listQueryUpdate = [];
        var where = getWhereList(whereList, config, listTable);
        StvDao.transaction(function (trans) {
            localDataSync["insertedData"] = {};
            // 1.1 Get inserted data.
            var querySql = "";
            if (where != "") {
                querySql = "SELECT DISTINCT tableName,tablePK FROM SYNC_DATA WHERE tablePK IN " + where + " and isDeleted = 0 and latestUpdateBy is null";
            } else {
                querySql = "SELECT DISTINCT tableName,tablePK FROM SYNC_DATA  WHERE isDeleted = 0 and latestUpdateBy is null";
            }
            trans.sqlExe(querySql, [], function (tx, results) {
                _totalSyncData += results.rows.length;
                var len = results.rows.length;
                var count = 0;
                for (var countTable = 0; countTable < listTable.length; countTable++) {
                    var listIdName = [];
                    var lenOfTable = 0;
                    for (var i = 0; i < len; i++) {
                        if (results.rows.item(i).tableName == listTable[countTable]) {
                            log.info("local data insert" + JSON.stringify(results.rows.item(i)));
                            listIdName.push(results.rows.item(i));
                            lenOfTable++;
                        }
                    }
                    var listPK = [];
                    listPK = config[listTable[countTable]].split(",");
                    lenPK = listPK.length;
                    if (lenOfTable == 0) {
                        log.info("Nothing insert");
                        var metadataList = [];
                        var obj = localDataSync["insertedData"];
                        obj[listTable[countTable]] = metadataList;
                    } else {
                        listQueryInsert[count] = getListQuery(listIdName,listPK,listTable[countTable]);
                        count++;
                        log.info(listQueryInsert[count]);
                    }
                }
            });
            //     1.2 Get updated local data.
            if (where != "") {
                querySql = "SELECT DISTINCT tableName,tablePK FROM SYNC_DATA WHERE tablePK IN " + where + " and isDeleted = 0 and latestUpdateBy is not null";
            } else {
                querySql = "SELECT DISTINCT tableName,tablePK FROM SYNC_DATA  WHERE isDeleted = 0 and latestUpdateBy is not null";
            }
            localDataSync["updatedData"] = {};
            trans.sqlExe(querySql, [], function (tx, results) {
                _totalSyncData += results.rows.length;
                var len = results.rows.length;
                var count = 0;
                for (var countTable = 0; countTable < listTable.length; countTable++) {
                    log.info("Table " + countTable + ":" + listTable[countTable]);
                    var listIdName = [];
                    var lenOfTable = 0;
                    for (var i = 0; i < len; i++) {
                        log.info("Len:" + JSON.stringify(results.rows.item(i)));
                        if (results.rows.item(i).tableName == listTable[countTable]) {
                            log.info("local data insert" + JSON.stringify(results.rows.item(i)));
                            listIdName.push(results.rows.item(i));
                            lenOfTable++;
                        }
                    }
                    var listPK = [];
                    listPK = config[listTable[countTable]].split(",");
                    lenPK = listPK.length;
                    if (lenOfTable == 0) {
                        log.info("Nothing insert");
                        var metadataList = [];
                        var obj = localDataSync["updatedData"];
                        obj[listTable[countTable]] = metadataList;
                    } else {
                        listQueryUpdate[count] = getListQuery(listIdName,listPK,listTable[countTable]);
                        count++;
                        log.info(listQueryUpdate[count]);
                    }
                }
                log.info("listQuery:" + listQueryUpdate);
            });
            // 2. Get deleted data for synchronize
            if (where != "") {
                querySql = "SELECT tablePK, tableName FROM SYNC_DATA WHERE tablePK IN " + where + " and isDeleted = 1";
            } else {
                querySql = "SELECT tablePK, tableName FROM SYNC_DATA WHERE isDeleted = 1";
            }
            trans.sqlExe(querySql, [], function (tx, results) {
                log.info("result of delete data:" + JSON.stringify(results));
                _totalSyncData += results.rows.length;

                var metadataList = [];
                var len = results.rows.length;
                for (var i = 0; i < len; i++) {
                    log.info("Local data:" + JSON.stringify(results.rows.item(i)));
                    metadataList.push(results.rows.item(i));
                }
                localDataSync["deletedData"] = metadataList;
                log.info("Sync data after get deletedData:" + JSON.stringify(localDataSync));
            });
        }, null, function () {
            isCompleted = true;
            getLocalDataInApp(listQueryUpdate, listQueryInsert, localDataSync, revisionInfo, listMetadata, _totalSyncData, url, tableNameItem, callback);
        });
    };

    /**
     * @summary get condition query in local database
     * @function getListQuery
     * @static
     *
     * @param {Array} listIdName
     *  List some tablePK
     * @param {Array} listPK
     *  List some key in local database
     * @param {String} tableName
     *  Name of table
     */
    var getListQuery = function(listIdName, listPK, tableName){
        if((listIdName != undefined)&&(JSON.stringify(listIdName).length >2) && (listIdName !== null)){
            if((listPK != undefined)&&(listPK.length >0) && (listPK !== null)){
                var lenPK = listPK.length;
                var temp = [];
                log.info("ListIdName length" + listIdName.length);
                var k = 0;
                for (k = 0; k < listIdName.length; k++) {
                    log.info("List ITEM:" + listIdName[k].tablePK.split(","));
                    var array = listIdName[k].tablePK.split(",");
                    var lenArray = array.length;
                    log.info("Len Array:" + lenArray);
                    temp = temp.concat(array);
                }

                log.info("Temp:" + temp);
                var clauseAfterWhere = "";
                for (k = 0; k < lenPK; k++) {
                    var listTam = [];
                    for (var u = 0; u < temp.length; u++) {
                        if (k == (u % lenPK)) {
                            listTam = listTam.concat(temp[u]);
                        }
                    }
                    log.info("list tam:" + listTam);
                    var strListValue = "";
                    for (var t = 0; t < listTam.length; t++) {
                        strListValue = strListValue + "'" + listTam[t] + "',";
                    }

                    strListValue = strListValue.substring(0, strListValue.length - 1);
                    log.info("list string tam:" + strListValue);
                    clauseAfterWhere = clauseAfterWhere + listPK[k] + " IN (" + strListValue + ") AND ";
                }

                clauseAfterWhere = clauseAfterWhere.substring(0, clauseAfterWhere.length - 5);
                log.info("Log tam:" + clauseAfterWhere);
                var querySql1 = tableName + "?SELECT * FROM " + tableName + " WHERE " + clauseAfterWhere;
                log.info("String query update:" + querySql1);
                return querySql1;
            }else{
                throw new IllegalArgumentException("listPK must not null or empty or undefined")
            }
        }else{
            throw new IllegalArgumentException("listIdName must not null or empty or undefined")
        }
    }
    /**
     * @summary update revisionId in table revision
     * @function updateRevision
     * @static
     *
     * @param {Object} revisionData
     *  data about revisionId to update revision table
     */
    StvSync.updateRevision = function (revisionData) {
        StvDao.transaction(function (trans) {
            var updateQuery = "UPDATE REVISION SET revisionId = " + "'" + revisionData + "'";
            trans.sqlExe(updateQuery, [], null, null);
        });
    };


    /**
     * @summary before send request to server
     * @function sendRequest
     * @static
     *
     * @param {Object} listMetadata
     *  data of metadata save in table sync_data
     * @param {Object} revisionInfo
     *  data of revision contain user create by and value of revisionId
     * @param {String} url
     *  directory path of server
     * @param {function} callback
     *  function is called after sendRequest
     */
    StvSync.sendRequest = function (listMetadata, revisionInfo, url, objNotWhere, callback) {
        var requestSync = {};

        // 1. Combine data to request synchronize
        requestSync.revision = revisionInfo;
        requestSync.syncInfo = listMetadata;

        // 2. Send metadata for request synchronize
        // Define callback function after received status OK
        log.info("Send request Sync:" + JSON.stringify(requestSync));
        var requestSyncUrl = url + "requestSync";
        StvSync.sendDataToServer(requestSyncUrl, requestSync, objNotWhere, callback);
    };

    /**
     * @summary before send request to server
     * @function sendRequestSync
     * @static
     *
     * @param {String} url
     *  directory path of server
     * @param {Object} tableList
     *  contain list of table synchronized and user create record
     * @param {Array} whereList
     *  condition getmetadata, contain primary key of table synchornized
     * @param {String} config
     *  Object contain information in config sync file
     * @param {function} callback
     *  function is called after sendRequest
     */
    StvSync.sendRequestSync = function (url, tableList, whereList, config, callback) {
        // 1. Get metadata for request synchronize
        StvSync.getMetadata(tableList, whereList, config, function (listMetadata, revisionInfo, objNotWhere) {
            StvSync.sendRequest(listMetadata, revisionInfo, url, objNotWhere, callback);
        });
    };

    /**
     * @summary change trigger update to insert
     * @function changeFromUpdateToInsert
     * @static
     *
     * @param {Object} deletedData
     *  list data deleted receive from server
     */
    StvSync.changeFromUpdateToInsert = function(deletedData){
        log.info("Delete data:"+JSON.stringify(deletedData))
        var lenDeleted = deletedData.length;
        for(var i = 0; i<lenDeleted ; i++){
            changeOneFromUpdateToInsert(deletedData[i]);
        }
    };

    /**
     * @summary change one trigger update to insert
     * @function changeOneFromUpdateToInsert
     * @static
     *
     * @param {Object} data
     *  a data deleted receive from server
     */
    var changeOneFromUpdateToInsert = function(data){
        log.info("Data delete:"+ JSON.stringify(data));
        StvDao.transaction(function(trans){
            var query = "UPDATE SYNC_DATA SET latestUpdateBy = null, latestUpdateTime = null WHERE tableName = '"+data.tableName+"' AND tablePK = '"+data.tablePK+"'";
            trans.sqlExe(query, [], null, null);
        })
    };

    /**
     * @summary change trigger update to insert
     * @function changeFromUpdateToInsert
     * @static
     *
     * @param {Object} config
     *  Object contain information in config sync file
     * @param {Object} tableList
     *  contain list of table synchronized and user create record
     * @param {Object} insertedData
     *  List data conflict insert from server
     */
    StvSync.changeFromInsertToUpdate = function(config, tableList, insertedData){
        log.info("Inserted data:"+JSON.stringify(insertedData));
        var listTable = tableList["tableName"].split(",");
        var userData = tableList["createBy"];
        var lenTable = listTable.length;
        for(var j = 0; j <lenTable; j++){
            if(insertedData[listTable[j]]){
                var lenInserted = insertedData[listTable[j]].length;

                for(var i = 0; i<lenInserted ;i++){
                    if(insertedData[listTable[j]][i]){
                        var tablePK = combinePK(insertedData[listTable[j]][i], config, listTable[j]);
                        changeOneFromInsertToUpdate(listTable[j],tablePK, userData);
                    }
                }
            }
        }
    };

    /**
     * @summary change trigger update to insert
     * @function changeFromUpdateToInsert
     * @static
     *
     * @param {String} tableName
     *  contain key tableName in table Sync_data
     * @param {String} tablePK
     *  contain key tablePK in table Sync_data
     * @param {String} userData
     *  Contain param latestUpdateBy in table Sync_data
     */
    var changeOneFromInsertToUpdate = function(tableName,tablePK,userData){
        var sql  = "SELECT * FROM SYNC_DATA WHERE tableName = '"+tableName+"' AND tablePK ='"+tablePK+"' AND latestUpdateBy is null";
        StvDao.transaction(function(trans){
            trans.sqlExe(sql,[],function(tx, result){
                var len = result.rows.length;
                if(len != 0){
                    var query = "UPDATE SYNC_DATA SET latestUpdateBy = '"+userData+"', latestUpdateTime = "+DATETIME('NOW')+" WHERE tableName = '"+data.tableName+"' AND tablePK = '"+data.tablePK+"'";
                    tx.sqlExe(query, [], null, null);
                }
            })
        })
    };

    StvSync.testCombinePK = function (data, config, tableName){
		return combinePK(data, config, tableName);
	};
	
	StvSync.testGetWhereList = function (whereList, config, listTable){
		return getWhereList(whereList, config, listTable);
    };
    
    StvSync.testGetListQuery = function(listIdName, listPK, tableName){
        return getListQuery(listIdName, listPK, tableName);
    }

    StvSync.testCreateObject = function(metadataListNotInWhere, listTable, config){
        return createObject(metadataListNotInWhere, listTable, config)
    }

    return StvSync;

})();