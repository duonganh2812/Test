/**
 * @(#)staveware-hybrid-dao.js v.4.0.0
 * (C)Copyright 2013-2016 Toshiba Solutions Corporation, All rights reserved.
 */


/**fileoverview staveware-hybrid-dao handle data which was saved in database
 *
 *<p>this file's functions publish handle data which was saved in database
 *<p>The base functions of staveware-hybrid-dao feature:
 *<li> 1.StvSQL:This class contain code to read and check file xml
 *<li> 2.StvDAO:This class contain clause sql to execute handle to database
 *
 *@version Staveware Mobile for Hybrid Ver.4.0
 *
 */


/**
 * Constructs a new StvSQL object.<br>
 *
 * @class
 * @classdesc This class is used to hold the QuerySQL Request ...
 * User does not need create a object of this class, ...
 * instance of this class that be used to hold the customized config.
 *
 * @version Staveware Mobile for Hybrid Ver.4.0
 * @return a new Config instance
 */
generateClass("StvSQL", Object, function (_me, _superclass) {
  _me.sqlMap = null;

  /**
   * initialize query from config file
   *
   * @param {String} sqlFilename is path file directory contain query sql of database
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.init = function (sqlFileName) {
    if (sqlFileName) {
      this.sqlMap = parseSql(sqlFileName);
    } else {
      throw new IllegalArgumentException("SqlFile can not be null, empty or undefined.");
    }
  };

  /**
   * get query SQL from config file
   *
   * @param {String} sqlId is identify of SQL
   * @return the query sql
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.getSQL = function (sqlId) {
    if (sqlId) {
      if (this.sqlMap[sqlId]) {
        return this.sqlMap[sqlId].query;
      } else {
        return null;
      }
    } else {
      throw new IllegalArgumentException("id of sql query can not be null, empty or undefined.");
    }
  };

  /**
   * get query SQL from config file after checking
   *
   * @param {String} sqlId is identify of SQL
   * @param {String} typeSql is type of sql(ex. sql, insert...)
   * @return the query sql
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.getSQLWithCheck = function (sqlId, typeSql) {
    if (this.checkSQLType(sqlId, typeSql)) {
      return this.getSQL(sqlId);
    }
    return null;
  };

  /**
   * Check  type SQL from config file
   *
   * @param {String} sqlId is identify of SQL
   * @param {typeSql} typeSql is type of sql(ex. sql, insert...)
   * @return true if correct or false if incorrect
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.checkSQLType = function (sqlId, typeSql) {
    if (!sqlId || !typeSql) {
      return false;
    } else {
      if (this.sqlMap[sqlId]) {
        var type = this.sqlMap[sqlId].type;
        if (type.toLowerCase() === typeSql.toLowerCase()) {
          return true;
        }
      }
      return false;
    }
  };

  /**
   * parse SQL from config file
   *
   * @param {String} sqlFileName is path file directory contain query sql of database
   * @return Object contain type and query of id in config file
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  var parseSql = function (sqlFileName) {
    var resultMap = [];
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", sqlFileName, false);
    xhttp.send("");
    var xmlDoc = xhttp.responseXML;
    if (xmlDoc) {
      var element = xmlDoc.getElementsByTagName("sqlMap")[0];
      var childNodes = element.childNodes;
      for (var i = 0; i < childNodes.length; i++) {
        var childNode = childNodes[i];
        var nodeType = childNode.nodeType;
        if (nodeType === 1) {
          var query = childNode.childNodes[0].nodeValue;
          if (query) {
            resultMap[childNode.getAttribute("id")] = {
              "type": childNode.nodeName,
              "query": format(query)
            };
            if (childNode.getAttribute("sqlfile")) {
              resultMap[childNode.getAttribute("id")]["sqlfile"] = childNode.getAttribute("sqlfile");
            }
          }
        }
      }
      return resultMap;
    } else {
      throw new IllegalArgumentException("The SQLMap file is not found.");
    }
  };

  /**
   * format SQL from config file
   *
   * @param {String} str need format
   * @return str is formated
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  var format = function (str) {
    str = str.replace(/\n/g, "");
    str = str.replace(/^\s+/, "");
    str = str.replace(/\s+$/, "");
    return str;
  };
});


/**
 * Constructs a new StvDAO object.<br>
 *
 * @class
 * @classdesc This class is used to hold the LocalDAO Request ...
 * User does not need create a object of this class, ...
 * instance of this class that be used to hold the customized config.
 *
 * @version Staveware Mobile for Hybrid Ver.4.0
 * @return a new Config instance
 */
generateClass("StvDAO", Object, function (_me, _superclass) {
  _me.sql = null;
  _me.dbMap = null;
  _me.currentDB = null;
  _me.sqlFile = null;
  _me.debugLog = null;

  /**
   * initialize database from config file
   *
   * @param {String} dbFileName is path file directory contain name of database
   * @param {String} sqlFilename is path file directory contain query sql of database
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.init = function (dbFileName, sqlFilename) {
    debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);
    var source = window.location.href;
    var elemsource = source.split("/www/");
    var www = elemsource[0] + "/www/";
    if (dbFileName) {
      dbFileName = www + dbFileName + ".xml";
    } else {
      dbFileName = www + "staveware/staveware-dbmap.xml";
    }
    if (sqlFilename) {
      this.sqlFile = "www/" + sqlFilename + ".xml";
      sqlFilename = www + sqlFilename + ".xml";
    } else {
      this.sqlFile = "www/staveware/staveware-sqlmap.xml";
      sqlFilename = www + "staveware/staveware-sqlmap.xml";
    }
    this.dbMap = parseDB(dbFileName);
    this.sql = new StvSQL(sqlFilename);
  };

  /**
   * Open database which was initialize in config file
   *
   * @param {String} dbName is name of database
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.openDatabase = function (dbName) {
    if (this.dbMap[dbName]) {
      // open by sqlite plugin
      if (this.dbMap[dbName].database === "sqlite" ||
        this.dbMap[dbName].database === null) {
        debugLog.info("open by sqlite plugin");
        this.currentDB = window.sqlitePlugin.openDatabase({
          name: dbName,
          version: this.dbMap[dbName].version,
          displayName: this.dbMap[dbName].displayName,
          size: this.dbMap[dbName].size,
          location: 'default'
        });
      }
      // open by sqlcipher plugin
      else if (this.dbMap[dbName].database === "sqlcipher") {
        debugLog.info("open by sqlcipher plugin");
        this.currentDB = window.sqlCipherPlugin.openDatabase(dbName,
          this.dbMap[dbName].version,
          this.dbMap[dbName].displayName,
          this.dbMap[dbName].size,
          this.dbMap[dbName].passwordLength);
      } else {
        throw new IllegalArgumentException("Database type is wrong. Not support database type " + this.dbMap[dbName].database + ".");
      }
      if (!this.currentDB) {
        throw new IllegalArgumentException("Can not open database " + dbName + ".");
      }
    } else {
      throw new IllegalArgumentException("database " + dbName + " is not found.");
    }
  };

  /**
   * parse attribute of database in config file
   *
   * @param {String} dbFileName is path file directory contain name of database
   * @return Object contain attribute and map its value
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  var parseDB = function (dbFileName) {
    var resultMap = [];
    debugLog.info("StvDAO#parseDB " + dbFileName);
    var xhttp = new XMLHttpRequest();
    xhttp.open("GET", dbFileName, false);
    xhttp.send(null);
    var xmlDoc = xhttp.responseXML;
    if (xmlDoc) {
      var elems = xmlDoc.getElementsByTagName("db");
      for (var i = 0; i < elems.length; i++) {
        var elem = elems[i];
        var dbName = elem.getAttribute("name");
        var version = elem.getAttribute("version");
        var displayName = elem.getAttribute("displayName");
        var size = elem.getAttribute("size");
        var database = elem.getAttribute("database");
        var passwordLength = elem.getAttribute("passwordLength");
        resultMap[dbName] = {
          "version": version,
          "displayName": displayName,
          "size": size,
          "passwordLength": passwordLength,
          "database": database
        };
      }
      return resultMap;
    } else {
      throw new IllegalArgumentException(dbFileName + " is not found.");
    }
  };

  /**
   * A transaction is performed. Execution of SQL is performed in this transaction
   *
   * @param {function} populateDB is callback function contain query sql to execute
   * @param {function} errorCB is callback function execute when error
   * @param {function} errorCB is callback function execute when success
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.transaction = function (populateDB, errorCB, successCB) {
    var my = this;
    if (!errorCB) {
      errorCB = function (err) {
        debugLog.info(err.message);
      };
    }
    if (this.currentDB) {
      this.currentDB.transaction(function (tx) {
        populateDB(my.transactionEx(tx));
      }, errorCB, successCB);
    } else {
      throw new IllegalArgumentException('StvDAO#openDatabase() should be done before transaction starts.');
    }
  };

  /**
   * execute transaction of database
   *
   * @param {function} tx is callback function contain query sql to execute
   * @return tx is value of transaction
   *
   * @version Staveware Mobile for Hybrid Ver.4.0
   */
  _me.transactionEx = function (tx) {
    var my = this;
    var sqlQuery = null;
    tx.sql = function (sqlId, args, successCB, errorCB) {
      debugLog.info("StvDAO#sql: " + sqlId);
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "sql");
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", SQL query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", SQL query at id [" + sqlId + "] is wrong.");
      }
    };

    tx.insertSQL = function (sqlId, args, successCB, errorCB) {
      debugLog.info("StvDAO#insertSQL");
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "insert");
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", Insert query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", Insert query at id [" + sqlId + "] is wrong.");
      }
    };

    // TSDV added
    /**
   * @summary This function is used to insert multiple record to sqlite database
   *  
   * <ul style = "list-style: none;">
   * <li> • In the case, param dataJson is null, execute insert multiple record from json file to sqlite database
   * <li> • In the case, param dataJson is an Array or an Object, execute insert data from Array or Object to sqlite database
   * </ul>
   * 
   * @function bulkInsertSQL
   *
   * @param {string} sqlId
   * The Id mapping with insert sql query which is used for bulk insert data to sqlite
   *
   * @param {Object} args
   * This parram is null
   * 
   * @param {function} successCB
   * Success callback function
   * 
   * @param {function} errorCB
   * Error callback function
   * 
   * @param {Object | Array} dataJson
   * Data is used to insert to sqlite database
   *
   */

    tx.bulkInsertSQL = function (sqlId, args, successCB, errorCB, dataJson) {
      debugLog.info("StvDAO#insertSQL");
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "insert");
      if (sqlQuery) {
        var sqlFile = my.sql.sqlMap[sqlId]["sqlfile"];
        if (dataJson == null && sqlFile != null) {
          var dataFromFile = StvCommon.readJsonFile(sqlFile);
          for (let i = 0; i < dataFromFile.length; i++) {
            let arr = Object.keys(dataFromFile[i]).map(j => dataFromFile[i][j]);
            tx.executeSql(sqlQuery, arr, successCB, errorCB);
          }
        } else {
          if (dataJson instanceof Array) {
            for (let i = 0; i < dataJson.length; i++) {
              let arr = Object.keys(dataJson[i]).map(j => dataJson[i][j]);
              tx.executeSql(sqlQuery, arr, successCB, errorCB);
            }
          } else {
            let arr = Object.keys(dataJson).map(j => dataJson[j]);
            tx.executeSql(sqlQuery, arr, successCB, errorCB);
          }
        }
      } else {
        debugLog.error("In file: " + my.sqlFile + ", bulkInsertSQL query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", bulkInsertSQL query at id [" + sqlId + "] is wrong.");
      }
    };

    tx.selectSQL = function (sqlId, args, successCB, errorCB) {
      debugLog.info("StvDAO#selectSQL");
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "select");
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", Select query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", Select query at id [" + sqlId + "] is wrong.");
      }
    };

    tx.updateSQL = function (sqlId, args, successCB, errorCB) {
      debugLog.info("StvDAO#updateSQL");
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "update");
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", Update query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", Update query at id [" + sqlId + "] is wrong.");
      }
    };

    tx.deleteSQL = function (sqlId, args, successCB, errorCB) {
      debugLog.info("StvDAO#deleteSQL");
      sqlQuery = my.sql.getSQLWithCheck(sqlId, "delete");
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", Delete query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", Delete query at id [" + sqlId + "] is wrong.");
      }
    };

    tx.sqlExe = function (sqlQueryInput, args, successCB, errorCB) {
      debugLog.info("StvDAO#sqlExe:" + sqlQueryInput);
      sqlQuery = sqlQueryInput;
      if (sqlQuery) {
        tx.executeSql(sqlQuery, args, successCB, errorCB);
      } else {
        debugLog.error("In file: " + my.sqlFile + ", SQL query at id [" + sqlId + "] is wrong.");
        throw new IllegalArgumentException("In file: " + my.sqlFile + ", SQL query at id [" + sqlId + "] is wrong.");
      }
    };

    return tx;
  };
});
