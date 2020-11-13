/**
 * @(#)staveware-hybrid-offlineAuthenticate.js
 * (C)Copyright 2018 Toshiba Digital Solutions Corporation
 *
 * Offline Authenticate function.
 */

/**
 * Constructs a new StvAuth object.<br>
 * @class
 * @classdesc This class is used to offline authenticate.
 *
 * @version Staveware Mobile for Hybrid Ver.4.0
 * @return a new StvAuth instance
 */

var StvAuth = (function () {
    /**
     * Constructor. This should not be used.
     * @constructor StvAuth
     */
    var StvAuth = function StvAuth() {};

    /**
     * @init Log function
     */
    var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);

    /**
     * @summary Read data config form .xml file
     * @function readDataConfig
     *
     * @param {string} filePath
     *  directory path of file config
     * @return {object} resultMap
     */

    var readDataConfig = function (filePath) {
        if ((filePath !== "") && (filePath !== null) && (filePath != undefined)) {
            var resultMap = null;
            var xhttp = new XMLHttpRequest();
            xhttp.open("GET", filePath, false);
            xhttp.send(null);
            var xmlDoc = xhttp.responseXML;
            if (xmlDoc) {
                var elems = xmlDoc.getElementsByTagName("cf");
                var elem = elems[0];
                var activeTime = elem.getAttribute("activeTime");
                resultMap = {
                    activeTime: activeTime
                };
                return resultMap;
            } else {
                throw new IllegalArgumentException(filePath + " is not found.");
            }
        } else {
            throw new IllegalArgumentException("filePath must not null or empty or undefined")
        }
    };


    /**
     * @summary Create account table if not exist.
     * @function createAccountTable
     *
     * @param {object} stvDAO
     * instance of StvDAO
     */

    var createAccountTable = function (stvDAO) {
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            // Create tables if not exist
            trans.sql("createAccountTable", [], null, null);
        }, function errorCB() {
            debugLog.error("Error create table ACCOUNT TABLE");
        }, function successCB() {
            debugLog.info("Success create table ACCOUNT TABLE");
        });
    };

    //ONLINE AUTHENTICATE FUNCTION


    /**
     * @summary Handle after authenticate Online is success.
     *  <ul style="list-style: none;">
     *  <li> •  Create table if not exist.
     *  <li> •  Calculate valid end time of account.
     *  <li> •  Encode password to SHA256.
     *  <li> •  Check account is exist or not exist then update or insert account's information
             to sqlite database when server response success.
     * </ul>
     * @function registerAccountInfo
     * @static
     * @example
     * <pre>
     * Example:
     *      StvAuth.registerAccountInfo("SampleApp", id, password, expand, function(result){
                                                     //HANDLE SUCCESS EVENT
                                                     console.log(result)
                                                    }, function(error){
                                                     //HANDLE FAIL EVENT
                                                     console.log(error)
                                                  });
     * </pre>
     * @param {string} dbName
     *  Database name
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {string} expand
     *  Extension attribute
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */

    StvAuth.registerAccountInfo = function (dbName, id, password, expand, successCallback, errorCallback) {
        var stvDAO = new StvDAO("staveware/staveware-dbmap", "staveware/staveware-sqlmap");
        stvDAO.openDatabase(dbName);
        createAccountTable(stvDAO);
        var validEndTime = calculateAccountValidEndTime("staveware/staveware-config.xml");
        var _password = encodePasswordSHA256(id, password);
        checkAccount(stvDAO, id, function (rs) {
            if (rs === 0) {
                insertAccountInformation(stvDAO, id, _password, validEndTime, expand, successCallback, errorCallback);
            } else {
                updateAccountInformation(stvDAO, id, _password, validEndTime, expand, successCallback, errorCallback);
            }
        }, function (err) {
            errorCallback(err);
        });
    };


    /**
     *  @summary Calculate valid end time for account.
     *  <ul style="list-style: none;">
     *  <li> • StvMobileUtil is used to get current system time.
     *  <li> • activeTime read from config file, unit is hours(H).
     *  <li> • validEndTime unit is milliseconds.
     *  </ul>
     * @function calculateAccountValidEndTime
     * 
     * @param {string} filePath
     *  directory path of file config
     *
     * @return {number} validEndTime > 0 if activeTime > 0
     * @return {number} validEndTime = 0 if activeTime <=0 or " "
     */
    var calculateAccountValidEndTime = function (filePath) {
        var config = readDataConfig(filePath);
        var activeTime = config.activeTime;
        var validEndTime;
        if ((activeTime !== null) && (activeTime !== undefined)) {
            if ((activeTime <= 0) || (activeTime === "")) {
                validEndTime = 0;
                return validEndTime;
            } else {
                var validStartTime = StvMobileUtil.getTime();
                //convert activeTime to milliseconds => activeTime * 60 * 60 * 1000
                validEndTime = validStartTime + activeTime * 60 * 60 * 1000;
                return validEndTime;
            }
        } else {
            throw new IllegalArgumentException("activeTime must not null");
        }
    };


    /**
     *  @summary Check account is exist or not.
     *  <ul style="list-style: none;">
     *    <li> • If account is exist update valid end time of user to Sqlite database.
     *    <li> • If account is not exist insert new account's information to Sqlite database.
     *  </ul>
     * @function checkAccount
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */
    var checkAccount = function (stvDAO, id, successCallback, errorCallback) {
        var _count = null;
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            trans.selectSQL("selectAccountCount", [id], function (tx, rs) {
                _count = rs.rows.item(0).CID;
                successCallback(_count);
            }, function () {
                debugLog.debug("Error count query");
            });
        }, function errorCB() {
            debugLog.error("Error transaction countAccount");
            errorCallback("Error transaction countAccount");
        }, function successCB() {
            debugLog.info("Success transaction countAccount");
        });
    };


    /**
     * @summary Insert new account.
     *  <ul style="list-style: none;">
     *    <li> •  Insert new account's information to Sqlite database.
     *    <li> •  Callback authenticate success if insert success.
     * </ul>
     * @function insertAccountInformation
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {number} validEndTime
     *  account's validEndTime
     * @param {string} expand
     * Extension attribute
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */

    var insertAccountInformation = function (stvDAO, id, password, validEndTime, expand, successCallback, errorCallback) {
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            trans.insertSQL("insertAccount", [id, password, validEndTime, expand], function () {
                successCallback("Authenticate online success");
            }, function () {
                debugLog.error("Error insert account");
            });
        }, function errorCB() {
            debugLog.error("Error transaction insertAccount");
            errorCallback("Error transaction insertAccount");
        }, function successCB() {
            debugLog.info("Success transaction insertAccount");
        });
    };


    /**
     *  @summary Update account.
     *  <ul style="list-style: none;">
     *  <li> • Update account's information to Sqlite database.
     *  <li> • Callback authenticate success if update success.
     * </ul>
     * @function updateAccountInformation
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {number} validEndTime
     *  account's validEndTime
     * @param {string} expand
     * Extension attribute
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */
    var updateAccountInformation = function (stvDAO, id, password, validEndTime, expand, successCallback, errorCallback) {
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            trans.updateSQL("updateAccount", [password, validEndTime, expand, id], function () {
                successCallback("Authenticate online success");
            }, function () {
                debugLog.error("Error query update account");
            });
        }, function errorCB() {
            debugLog.error("Error transaction updateAccount");
            errorCallback("Error transaction updateAccount");
        }, function successCB() {
            debugLog.info("Success transaction updateAccount");
        });
    };


    //OFFLINE AUTHENTICATE FUNCTION
    /**
     *  @summary Offline Authenticate.
     *  <ul style="list-style: none;">
         *  <li> •  Create table if not exist.
         *  <li> •  Get account's information from Sqlite database.
         *  <li> •  Authenticate account if it's exist.
     * </ul>
     * @function authenticateOffline
     * @static
     * @example
     * <pre>
     * Example:
     *   StvAuth.authenticateOffline("SampleApp", id, password, expand, function(result){
                                           //HANDLE SUCCESS EVENT
                                           console.log(result)
                                          }, function(error){
                                           //HANDLE FAIL EVENT
                                           console.log(error)
                                       });
     * </pre>
     * @param {string} dbName
     *  Database name
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {string} expand
     * Extension attribute
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */

    StvAuth.authenticateOffline = function (dbName, id, password, expand, successCallback, errorCallback) {
        var stvDAO = new StvDAO("staveware/staveware-dbmap", "staveware/staveware-sqlmap");
        stvDAO.openDatabase(dbName);
        createAccountTable(stvDAO);
        getAccountInformation(stvDAO, id, function (rs) {
            var _idDb = rs.idDb;
            var _passwordDb = rs.passwordDb;
            var _validEndTimeDb = rs.validEndTimeDb;
            var _expandDb = rs.expandDb;
            authenticate(stvDAO, id, password, expand, _idDb, _passwordDb, _validEndTimeDb, _expandDb, successCallback, errorCallback);
        }, function (err) {
            errorCallback(err);
        });
    };


    /**
     *  @summary Get account's information from Sqlite.
     *  <ul style="list-style: none;">
     *  <li> • If account is not exist callback authenticate fail.
     * </ul>
     * @function getAccountInformation
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */
    var getAccountInformation = function (stvDAO, id, successCallback, errorCallback) {
        var _count = null;
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            trans.selectSQL("selectAccount", [id], function (tx, rs) {
                _count = rs.rows.length;
                if (_count === 1) {
                    var _idDb = rs.rows.item(0)["ID"];
                    var _passwordDb = rs.rows.item(0)["PASSWORD"];
                    var _validEndTimeDb = rs.rows.item(0)["VALID_END_TIME"];
                    var _expandDb = rs.rows.item(0)["EXPAND"];
                    var result = {
                        idDb: _idDb,
                        passwordDb: _passwordDb,
                        validEndTimeDb: _validEndTimeDb,
                        expandDb: _expandDb
                    };
                    successCallback(result);
                } else {
                    debugLog.info("Error account not exist");
                    errorCallback("Error account not exist");
                }
            }, function () {
                debugLog.error("Error query getAccount");
            });
        }, function errorCB() {
            debugLog.error("Error transaction getAccount");
            errorCallback("Error transaction getAccount");
        }, function successCB() {
            debugLog.info("Success transaction getAccount");
        });
    };


    /**
     *  @summary Check account's validEndTime.
     *  <ul style="list-style: none;">
     *  <li> • Get current time of system then compare with account's validEndTime.
     *  <li> • StvMobileUtil is used to get current system time.
     *  <li> • If validEndTime = 0 account is infinite period, always return true.
     *  </ul>
     * @function checkAccountIsValidTime
     *
     * @param {number} validEndTime
     *  account's validEndTime
     *
     * @return {bool} true if account is unexpired
     * @return {bool} false if account is expired
     */
    var checkAccountIsValidTime = function (validEndTime) {
        if ((validEndTime !== null) && (validEndTime !== undefined) && (validEndTime >= 0) && (validEndTime !== "") && (typeof validEndTime !== 'string')) {
            if (validEndTime === 0) {
                return true;
            } else {
                var _currentTime = StvMobileUtil.getTime();
                if (_currentTime <= validEndTime) {
                    return true;
                } else {
                    return false;
                }
            }
        } else {
            throw new IllegalArgumentException("validEndTime not available");
        }
    };


    /**
     *  @summary Handle for offline authenticate function.
     *  <ul style="list-style: none;">
     *  <li> • Mapping account then compare id and password.
     *  <li> • If compare return true - Check account's validEndTime is expired or unexpired.
         <ul style="list-style: none;">
         * <li> • If account is unexpired - callback authenticate success.
         * <li> • If account is expired - delete account in sqlite database then callback authenticate fail.
         * </ul>
     *  <li> • If compare return false - callback authenticate fail.
     * </ul>
     * @function authenticate
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {string} expand
     * Extension attribute
     * @param {string} _idDb
     *  account's id get from sqlite database
     * @param {string} _passwordDb
     *  account's password get from sqlite database
     * @param {number} _validEndTimeDb
     *  account's validEndTime get from sqlite database
     * @param {string} _expandDb
     * Extension attribute get from sqlite database
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */

    var authenticate = function (stvDAO, id, password, expand, _idDb, _passwordDb, _validEndTimeDb, _expandDb, successCallback, errorCallback) {
        var _password = encodePasswordSHA256(id, password);
        var compare = mappingAccount(id, _password, expand, _idDb, _passwordDb, _expandDb);
        if (compare) {
            if (checkAccountIsValidTime(_validEndTimeDb)) {
                successCallback("Authenticate offline success");
            } else {
                deleteAccount(stvDAO, id, function (err) {
                    errorCallback(err);
                });
            }
        } else {
            debugLog.info("Error wrong account");
            errorCallback("Error wrong account");
        }
    };


    /**
     * @summary Delete account in sqlite database.
     * @function deleteAccount
     *
     * @param {object} stvDAO
     * instance of StvDAO
     * @param {string} id
     *  account's id
     * @param {function} callback
     *  callback function
     */
    var deleteAccount = function (stvDAO, id, callback) {
        var stvDao = stvDAO;
        stvDao.transaction(function (trans) {
            trans.deleteSQL("deleteAccount", [id], function () {
                debugLog.info("Error account is expired");
                callback("Error account is expired");
            }, function () {
                debugLog.error("Error query deleteAccount");
            });
        }, function errorCB() {
            debugLog.error("Error transaction delete account");
            callback("Error transaction delete account");
        }, function successCB() {
            debugLog.info("Success transaction delete account");
        });
    };


    /**
     * @summary Encode password to SHA256.
     *  <ul style="list-style: none;">
     *  <li> • Use CryptoJS library for encode.
     *  <li> • salt = hash(id).
     *  <li> • hashPassword = hash(password + salt).
     * </ul>
     * @function encodePasswordSHA256
     *
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     *
     * @return {string} hashPassword
     */
    var encodePasswordSHA256 = function (id, password) {
        var hashId = CryptoJS.SHA256(id).toString();
        var hashPassword = CryptoJS.SHA256(hashId + password).toString();
        return hashPassword;
    };


    /**
     * @summary Compare between data from user input and sqlite database.
     * @function mappingAccount
     *
     * @param {string} id
     *  id get from user input
     * @param {string} password
     *  password from user input
     *  password was encoded
     * @param {string} expand
     * Extension attribute
     * @param {string} idDb
     *  idDb get from sqlite database
     * @param {string} passwordDb
     *  passwordDb get from sqliteDb
     *  passwordDb is hash SHA256
     * @param {string} expandDb
     * Extension attribute get from sqlite database
     *
     * @return {bool} True if equal
     * @return {bool} False if not equal
     */
    var mappingAccount = function (id, password, expand, idDb, passwordDb, expandDb) {
        if (id === idDb && password === passwordDb && expand === expandDb) {
            return true;
        } else {
            return false;
        }
    };


    /**
    * @summary Get value of expand attributes from sqlite database
    * @function getExpandValues
    * @static
    * @example
    * <pre>
    * Example:
    *    StvAuth.getExpandValues("SampleApp", id, function (rs) {
              var companyId = rs.companyId;
        }, function (err) {
              console.log(err);
        });
    * </pre>
    * @param {string} dbName
    *  Database name
    * @param {string} id
    *  account's id
    * @param {function} successCallback
    *  callback function when success
    * @param {function} errorCallback
    *  callback function when error
    */

    StvAuth.getExpandValues = function (dbName, id, successCallback, errorCallback) {
        var _count = null;
        var stvDAO = new StvDAO("staveware/staveware-dbmap", "staveware/staveware-sqlmap");
        stvDAO.openDatabase(dbName);
        stvDAO.transaction(function (trans) {
            trans.selectSQL("selectExpand", [id], function (tx, rs) {
                _count = rs.rows.length;
                if (_count === 1) {
                    var _expandDb = rs.rows.item(0)["EXPAND"];
                    var expand = JSON.parse(_expandDb);
                    successCallback(expand);
                } else {
                    debugLog.info("Error account not exist");
                    errorCallback("Error account not exist");
                }
            }, function () {
                debugLog.error("Error query getExpandValues");
            });
        }, function errorCB() {
            debugLog.error("Error transaction getExpandValues");
            errorCallback("Error transaction getExpandValues");
        }, function successCB() {
            debugLog.info("Success transaction getExpandValues");
        });
    };

    //API without expand attributes

    /**
     * @summary Handle after authenticate Online is success.
     *  <ul style="list-style: none;">
     *  <li> •  Create table if not exist.
     *  <li> •  Calculate valid end time of account.
     *  <li> •  Encode password to SHA256.
     *  <li> •  Check account is exist or not exist then update or insert account's information
             to sqlite database when server response success.
     * </ul>
     * @function registerAccountInfoSimple
     * @static
     * @example
     * <pre>
     * Example:
     *      StvAuth.registerAccountInfoSimple("SampleApp", id, password, function(result){
                                                     //HANDLE SUCCESS EVENT
                                                     console.log(result)
                                                    }, function(error){
                                                     //HANDLE FAIL EVENT
                                                     console.log(error)
                                                  });
     * </pre>
     * @param {string} dbName
     *  Database name
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */
    StvAuth.registerAccountInfoSimple = function (dbName, id, password, successCallback, errorCallback) {
        var stvDAO = new StvDAO("staveware/staveware-dbmap", "staveware/staveware-sqlmap");
        stvDAO.openDatabase(dbName);
        createAccountTable(stvDAO);
        var validEndTime = calculateAccountValidEndTime("staveware/staveware-config.xml");
        var _password = encodePasswordSHA256(id, password);
        checkAccount(stvDAO, id, function (rs) {
            if (rs === 0) {
                insertAccountInformation(stvDAO, id, _password, validEndTime, null, successCallback, errorCallback);
            } else {
                updateAccountInformation(stvDAO, id, _password, validEndTime, null, successCallback, errorCallback);
            }
        }, function (err) {
            errorCallback(err);
        });
    };


    /**
     *  @summary Offline Authenticate.
     *  <ul style="list-style: none;">
         *  <li> •  Create table if not exist.
         *  <li> •  Get account's information from Sqlite database.
         *  <li> •  Authenticate account if it's exist.
     * </ul>
     * @function authenticateOfflineSimple
     * @static
     * @example
     * <pre>
     * Example:
     *   StvAuth.authenticateOfflineSimple("SampleApp", id, password, function(result){
                                           //HANDLE SUCCESS EVENT
                                           console.log(result)
                                          }, function(error){
                                           //HANDLE FAIL EVENT
                                           console.log(error)
                                       });
     * </pre>
     * @param {string} dbName
     *  Database name
     * @param {string} id
     *  account's id
     * @param {string} password
     *  account's password
     * @param {function} successCallback
     *  callback function when success
     * @param {function} errorCallback
     *  callback function when error
     */

    StvAuth.authenticateOfflineSimple = function (dbName, id, password, successCallback, errorCallback) {
        var stvDAO = new StvDAO("staveware/staveware-dbmap", "staveware/staveware-sqlmap");
        stvDAO.openDatabase(dbName);
        createAccountTable(stvDAO);
        getAccountInformation(stvDAO, id, function (rs) {
            var _idDb = rs.idDb;
            var _passwordDb = rs.passwordDb;
            var _validEndTimeDb = rs.validEndTimeDb;
            var _expandDb = null;
            authenticate(stvDAO, id, password, null, _idDb, _passwordDb, _validEndTimeDb, _expandDb, successCallback, errorCallback);
        }, function (err) {
            errorCallback(err);
        });
    };

    return StvAuth;
})();