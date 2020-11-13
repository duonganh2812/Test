/**
 * @(#)staveware-hybrid-queue.js ver.4.1.0
 * © 2018-2020 Toshiba Digital Solutions Corporation
 *
 * This function is to request with queue.
 */

var StvMobileUtil = (function () {
  var StvMobileUtil = function StvMobileUtil() {};
  var networkState = null;
  StvMobileUtil.isOnline = function () {
    return window.navigator.onLine;
  };
  StvMobileUtil.createDate = function () {
    return new Date().toLocaleString();
  };
  StvMobileUtil.setNetworkState = function (state) {
    networkState = state;
  };
  StvMobileUtil.getNetworkState = function () {
    return networkState;
  };
  StvMobileUtil.getTime = function () {
    return new Date().getTime();
  };
  StvMobileUtil.getPolicy = function () {
    // WebStorage
    if (
      $("#StvQueue").data("policy") ===
      StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE
    ) {
      return StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE;
    }
    // TSDV updated Sqlite
    else if (
      $("#StvQueue").data("policy") ===
      StvMobileConst.StoragePolicy.POLICY_SQLITE
    ) {
      return StvMobileConst.StoragePolicy.POLICY_SQLITE;
    }
    // Memory
    else return StvMobileConst.StoragePolicy.POLICY_MEMORY;
  };

  StvMobileUtil.isAddOnlineEvent = function () {
    if (
      $("#StvQueue").data("add_online_event") ==
      StvMobileConst.OnlineEvent.FALSE
    ) {
      return StvMobileConst.OnlineEvent.FALSE
    } else {
      return StvMobileConst.OnlineEvent.TRUE
    }
  }
  // TSDV added
  StvMobileUtil.getRequestType = function () {
    if ($("#StvQueue").data("reqtype") === StvMobileConst.RequestType.SYNC) {
      return StvMobileConst.RequestType.SYNC;
    } else {
      return StvMobileConst.RequestType.ASYNC;
    }
  };
  return StvMobileUtil;
})();

var StvMobileConst = (function () {
  var StvMobileConst = function StvMobileConst() {};
  StvMobileConst.Status = {
    INPUT_ERROR: 0,
    SERVER_ERROR: 1,
    COMM_ERROR: 2
  };
  // TSDV updated
  StvMobileConst.StoragePolicy = {
    POLICY_WEBSTORAGE: "webstorage",
    POLICY_MEMORY: "memory",
    POLICY_SQLITE: "sqlite"
  };
  // TSDV added
  StvMobileConst.RequestType = {
    ASYNC: "async",
    SYNC: "sync"
  };
  // For config online listener event
  StvMobileConst.OnlineEvent = {
    TRUE: true,
    FALSE: false
  };
  return StvMobileConst;
})();

/**
 * @class The class of request handler with queuing function.
 *
 * @since Staveware Mobile for Hybrid / Core Ver.4.0
 */
var StvRequestManager = (function () {
  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);
  var queueRequestCallback = null;
  var policy = StvMobileUtil.getPolicy();

  /**
   * Constructor of StvRequestManager .
   * @constructor
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  var StvRequestManager = function StvRequestManager() {};

  /**
   * @instance function for set callback instance .
   * Set instance if you use callback of queue request .
   *
   * @param {callbackObj} request callback object .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.setQueueRequestCallback = function (callbackObj) {
    queueRequestCallback = callbackObj;
  };

  /**
   * @instance Request API with queuing.
   *
   * @param {requestData} object of request information .
   * @returns XMLHttpRequest object.
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.queueRequest = function (requestData) {
    var id = StvMobileUtil.getTime();
    // temporarily store request data before request.
    StvQueue.enqueue(id, requestData);
    return this.ajaxRequest(id, requestData);
  };

  /**
   * @instance Re-send API with remain queuing data by async
   *
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.retryRequest = function () {
    var _this = this;
    var unSendList = [];
    debugLog.debug("Start to Retry Request Async...");
    // TSDV updated for storing by SQLite DB
    if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      StvQueue.dequeueAll(function (unSendList) {
        for (var i = 0, len = unSendList.length; i < len; i++) {
          _this.ajaxRequest(unSendList[i][0], unSendList[i][1]);
        }
      });
    }
    // WebStorage and Memmory
    else {
      unSendList = StvQueue.dequeueAll();
      for (var i = 0, len = unSendList.length; i < len; i++) {
        _this.ajaxRequest(unSendList[i][0], unSendList[i][1]);
      }
    }
  };

  /**
   * @instance Request API with queuing.
   *
   * @param {id} param queue data ID .
   * @param {requestData} object of request information .
   * @returns XMLHttpRequest object.
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.ajaxRequest = function (id, requestData) {
    debugLog.debug("Send to request ID:" + id);
    StvRequestManager.prepareRequest(requestData, function (requestFormData) {
      sendAjaxRequest(id, requestFormData, requestData);
    }, function (error) {
      StvQueue.removeQueue(id);
      StvFailureListManager.pushFailureData(id, requestData, error);
      if (queueRequestCallback !== null) {
        if (queueRequestCallback.hasOwnProperty("failureCallback")) {
          queueRequestCallback.failureCallback(requestData, error);
        }
      }
    });

    function sendAjaxRequest(id, requestFormData, requestData) {
      var xhrResult = null;
      $.ajax(requestFormData)
        .done(function (data, status, xhr) {
          debugLog.debug("Request Success : status = " + status);
          StvQueue.removeQueue(id); // delete queue data if success.
          var responseData = new Object();
          responseData.data = data;
          responseData.status = status;
          responseData.xhr = xhr;
          if (queueRequestCallback !== null) {
            if (queueRequestCallback.hasOwnProperty("successCallback")) {
              queueRequestCallback.successCallback(requestData, responseData);
            }
          }
          xhrResult = xhr;
        })
        .fail(function (xhr, status, error) {
          debugLog.debug("Status code:" + JSON.stringify(status));
          if (xhr.status === 0 || xhr.status === "408" || status === "timeout") {
            debugLog.debug("Request Timeout or Request Error because of offline");
          } else {
            debugLog.debug("Request Failure :" + error);
            var responseData = new Object();
            responseData.xhr = xhr;
            responseData.status = status;
            responseData.error = error;
            StvFailureListManager.pushFailureData(id, requestData, error);
            StvQueue.removeQueue(id);
            if (queueRequestCallback !== null) {
              if (queueRequestCallback.hasOwnProperty("failureCallback")) {
                queueRequestCallback.failureCallback(requestData, responseData);
              }
            }
          }
          xhrResult = xhr;
        });
      return xhrResult;
    }
  };

  /**
   * @instance Request API with queuing by sync request
   *
   * @param {id} param queue data ID .
   * @param {requestData} object of request information .
   * @returns Deferred object.
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.ajaxRequestSync = function (id, requestData) {
    debugLog.debug("Send to request ID:" + id);
    var dfd = $.Deferred();
    dfd = $.ajax(requestData);
    return dfd.promise();
  };

  /**
   * @instance Re-send API with remain queuing data by sync request
   *
   * @param {count} param number request .
   * @param {unSendList} object of list request .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.retrySync = function (count, unSendList) {
    StvRequestManager.prepareRequest(unSendList[count][1], function (requestFormData) {
      sendAjaxRequestSync(count, requestFormData, unSendList);
    }, function (error) {
      StvQueue.removeQueue(unSendList[count][0]);
      StvFailureListManager.pushFailureData(unSendList[count][0], unSendList[count][1], error);
      if (queueRequestCallback !== null) {
        if (queueRequestCallback.hasOwnProperty("failureCallback")) {
          queueRequestCallback.failureCallback(unSendList[count][1], error);
        }
      }
      if (count < unSendList.length) {
        count++;
        StvRequestManager.retrySync(count, unSendList);
      }
    });

    function sendAjaxRequestSync(count, requestFormData, unSendList) {
      StvRequestManager.ajaxRequestSync(
          unSendList[count][0],
          requestFormData)
        .done(function (data, status, xhr) {
          debugLog.debug("Request Success : status = " + status);
          StvQueue.removeQueue(unSendList[count][0]); // delete queue data if success.
          var responseData = new Object();
          responseData.data = data;
          responseData.status = status;
          responseData.xhr = xhr;
          if (queueRequestCallback !== null) {
            if (queueRequestCallback.hasOwnProperty("successCallback")) {
              queueRequestCallback.successCallback(
                unSendList[count][1],
                responseData);
            }
          }
          count++;
          if (count < unSendList.length) {
            StvRequestManager.retrySync(count, unSendList);
          } else {
            debugLog.debug("Send all request");
          }
        })
        .fail(function (xhr, status, error) {
          debugLog.debug("Status code:" + JSON.stringify(xhr));
          if (xhr.status === 0 || xhr.status === "408" || status === "timeout") {
            debugLog.debug("Request Timeout or Request Error because of offline");
          } else {
            debugLog.debug("Request Failure :" + error);
            var responseData = new Object();
            responseData.xhr = xhr;
            responseData.status = status;
            responseData.error = error;
            StvFailureListManager.pushFailureData(unSendList[count][0], unSendList[count][1], error);
            StvQueue.removeQueue(unSendList[count][0]);
            if (queueRequestCallback !== null) {
              if (queueRequestCallback.hasOwnProperty("failureCallback")) {
                queueRequestCallback.failureCallback(unSendList[count][1], responseData);
              }
            }
          }
          count++;
          if (count < unSendList.length) {
            StvRequestManager.retrySync(count, unSendList);
          } else {
            debugLog.debug("Send all request");
          }
        });
    }
  };

  /**
   * @instance Re-send API with remain queuing data by sync
   * @execute function retrySync
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvRequestManager.retryRequestSync = function () {
    var unSendList = [];
    var _this = this;
    debugLog.debug("Start to Retry Request Sync...");
    if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      StvQueue.dequeueAll(function (unSendList) {
        _this.retrySync(0, unSendList);
      });
    } else {
      unSendList = StvQueue.dequeueAll();
      _this.retrySync(0, unSendList);
    }
  };

  /**
   * @instance Read file from file path to Blob data
   * @param {fileInfo} array of file infomation .
   * @param {callbackSuccess} function of success callback .
   * @param {callbackError} function of error callback .
   *
   * @since Staveware Mobile for Hybrid / Core Ver.4.3
   */
  StvRequestManager.convertFileToBlob = function (fileInfo, callbackSuccess, callbackError) {
    if (fileInfo && fileInfo instanceof Object) {
      if (fileInfo["filePath"]) {
        window.resolveLocalFileSystemURL(fileInfo["filePath"], function (fileEntry) {
          fileEntry.file(function (file) {
            var reader = new FileReader();
            reader.onloadend = function () {
              var blob = new Blob([new Uint8Array(this.result)]);
              callbackSuccess(blob);
            };
            reader.readAsArrayBuffer(file);
          });
        }, function (error) {
          debugLog.debug("error message of convert file to blob: " + JSON.stringify(error));
          callbackError(error);
        });
      } else {
        var errorMess = "Cannot find filePath property";
        callbackError(errorMess);
      }
    } else {
      var blob = new Blob([]);
      callbackSuccess(blob);
    }
  }

  /**
   * @instance prepare request before send to server.
   *
   * @param {requestData} Object of request information.
   * @param {successCallback} function of success call back when prepare request.
   * @param {errorCallback} function of error call back when prepare request.
   * @since Staveware Mobile for Hybrid / Core Ver.4.3
   */
  StvRequestManager.prepareRequest = function (requestData, successCallback, errorCallback) {
    try {
      if (String(requestData["contentType"]).toLowerCase().includes("multipart/form-data")) {
        requestData["contentType"] = false;
      }
      if (String(requestData["contentType"]) == "false") {
        requestData["processData"] = false;
        var formData = new FormData();
        var fileProperties = [];
        var dataObject;
        if (typeof requestData["data"] == "string" || requestData["data"] instanceof String) {
          try {
            dataObject = JSON.parse(requestData["data"]);
          } catch (e) {
            debugLog.debug("Error parse json string to object: " + JSON.stringify(e.message));
            throw new Error("Error convert data of request to object");
          }
        } else {
          dataObject = requestData["data"];
        }
        var keys = Object.keys(dataObject);
        for (var i = 0; i < keys.length; i++) {
          var objectValue = dataObject[keys[i]];
          if (objectValue["type"] && String(objectValue["type"]).toLowerCase().trim() == "file") {
            fileProperties.push(keys[i]);
          } else {
            formData.append(keys[i], objectValue);
          }
        }
        var requestTemp = Object.assign({}, requestData);
        if (fileProperties.length > 0) {
          readFile(0, dataObject, 0, successCallback, errorCallback);
        } else {
          requestTemp["data"] = formData;
          successCallback(requestTemp);
        }
      } else {
        successCallback(requestData);
      }
    } catch (e) {
      debugLog.debug("Error prepare request " + JSON.stringify(e.message));
      errorCallback(e);
    }

    // function to convert file to Blob
    function readFile(countFile, dataTemp, indexFileProperty, successCallback, errorCallback) {
      if (dataTemp[fileProperties[indexFileProperty]] && dataTemp[fileProperties[indexFileProperty]]["value"]) {
        var fileList = dataTemp[fileProperties[indexFileProperty]]["value"];
        StvRequestManager.convertFileToBlob(fileList[countFile], function (blob) {
          if (fileList[countFile] && fileList[countFile]["fileName"]) {
            formData.append(fileProperties[indexFileProperty], blob, fileList[countFile]["fileName"]);
          } else {
            debugLog.debug("fileName property is not exist");
            formData.append(fileProperties[indexFileProperty], blob);
          }
          if (countFile >= fileList.length - 1) {
            if (indexFileProperty >= fileProperties.length - 1) {
              requestTemp["data"] = formData;
              successCallback(requestTemp);
            } else {
              indexFileProperty++;
              readFile(0, dataTemp, indexFileProperty, successCallback, errorCallback);
            }
          } else {
            countFile++;
            readFile(countFile, dataTemp, indexFileProperty, successCallback, errorCallback);
          }
        }, function (error) {
          debugLog.debug("Error convert file to Blob.");
          if (error["code"] == 1) {
            debugLog.debug("File is not found");
          } else {
            debugLog.debug("Error message is: " + JSON.stringify(error));
          }
          if (errorCallback) {
            errorCallback(error);
          }
        });
      } else {
        var errorMessage = "Error format file property in request.";
        debugLog.debug(errorMessage);
        errorCallback(errorMessage);
      }
    }
  }

  return StvRequestManager;
})();

/**
 * @class The class of queuing function.
 *
 * @since Staveware Mobile for Hybrid / Core Ver.4.0
 */
var StvQueue = (function () {
  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);
  var queueData = [];
  var policy = StvMobileUtil.getPolicy();
  var stvdao = null;
  var StvQueue = function StvQueue() {};

  /**
   * @instance initialize database for StvQueue.
   *
   * @param {stvDAO} stvdao object
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.init = function (stvDAO) {
    this.stvdao = stvDAO;
    debugLog.debug("Start create table QUEUE_DATA, FAILURE_DATA");
    this.stvdao.transaction(
      function (trans) {
        // Create tables if not exist
        trans.sql("createQueueDataTable", [], null, null);
        trans.sql("createFailureDataTable", [], null, null);
      },
      function errorCB() {
        debugLog.debug("Error create table QUEUE_DATA, FAILURE_DATA");
      },
      function successCB() {
        debugLog.debug("Success create table QUEUE_DATA, FAILURE_DATA");
      }
    );
  };

  /**
   * @instance Enqueue the storage with hash key.
   *
   * @param {key} param of queue data ID .
   * @param {requestData} object of request information .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.enqueue = function (key, requestData) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    if (requestData === null) {
      throw new IllegalArgumentException("can not set request data of null .");
    }
    if (requestData === undefined) {
      throw new IllegalArgumentException(
        "can not set request data of undefined ."
      );
    }
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON = JSON.stringify(["queue", key]);
      var valueJSON = JSON.stringify(requestData);
      if (localStorage.getItem(keyJSON) === null) {
        localStorage.setItem(keyJSON, valueJSON);
        debugLog.debug("LocalStorage added queue ID:" + key);
      } else {
        throw new IllegalArgumentException(
          "The key has already been registered ."
        );
      }
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var valueJSON = JSON.stringify(requestData);
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectQueueDataByKey", [key], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len === 0) {
              subTrans.insertSQL(
                "insertQueueData", [key, valueJSON],
                null,
                null
              );
            } else {
              throw new IllegalArgumentException(
                "The key has already been registered ."
              );
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite add queue ID");
        },
        function successCB() {
          debugLog.debug("SQLite added queue ID:" + key);
        }
      );
    }
    // Memmory
    else {
      for (var i = 0, len = queueData.length; i < len; i++) {
        if (queueData[i][0] === key) {
          throw new IllegalArgumentException(
            "The key has already been registered ."
          );
        }
      }
      queueData.push([key, requestData]);
      debugLog.debug("Memory added queue ID:" + key);
    }
  };

  /**
   * @instance Enqueue the storage without hash key.
   *
   * @param {requestData} object of request information .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.enqueueNoKey = function (requestData) {
    if (requestData === null) {
      throw new IllegalArgumentException("can not set request data of null .");
    }
    if (requestData === undefined) {
      throw new IllegalArgumentException(
        "can not set request data of undefined ."
      );
    }
    var key = StvMobileUtil.getTime();
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON = JSON.stringify(["queue", key]);
      var valueJSON = JSON.stringify(requestData);
      if (localStorage.getItem(keyJSON) === null) {
        localStorage.setItem(keyJSON, valueJSON);
        debugLog.debug("LocalStorage added queue ID:" + key);
      } else {
        throw new IllegalArgumentException(
          "The key has already been registered ."
        );
      }
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var valueJSON = JSON.stringify(requestData);
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectQueueDataByKey", [key], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len === 0) {
              subTrans.insertSQL(
                "insertQueueData", [key, valueJSON],
                null,
                null
              );
            } else {
              throw new IllegalArgumentException(
                "The key has already been registered ."
              );
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite add queue ID");
        },
        function successCB() {
          debugLog.debug("SQLite added queue ID:" + key);
        }
      );
    }
    // Memmory
    else {
      for (var i = 0, len = queueData.length; i < len; i++) {
        if (queueData[i][0] === key) {
          throw new IllegalArgumentException(
            "The key has already been registered ."
          );
        }
      }
      queueData.push([key, requestData]);
      debugLog.debug("Memory added queue ID:" + key);
    }
  };

  /**
   * @instance Dequeue head data of queue from the storage.
   *
   * @returns head queue data.
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.dequeueHead = function (callback) {
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var valueJSON = "";
      var value = null;
      for (var i = 0, len = localStorage.length; i < len; i++) {
        var keyJSON = null;
        keyJSON = localStorage.key(i);
        if (keyJSON !== null) {
          var keyList = null;
          keyList = eval("(" + keyJSON + ")");
          if (keyList[0] === "queue") {
            valueJSON = localStorage.getItem(keyJSON);
            value = eval("(" + valueJSON + ")");
            debugLog.debug(
              "from LocalStorage get with Head queue ID :" + keyList[1]
            );
          }
          break;
        }
      }
      return value;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var value = null;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectAllQueueData", [], function (tx, results) {
            var len = results.rows.length;
            if (len !== 0) {
              value = eval("(" + results.rows.item(0).valueData + ")");
            } else {
              debugLog.debug("Not found :" + key);
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite get Queue head");
          callback(value);
        },
        function successCB() {
          debugLog.debug("SQLite get Queue head");
          callback(value);
        }
      );
    }
    // Memmory
    else {
      var value = null;
      if (queueData.length > 0) {
        debugLog.debug(
          "from Memory get with Head queue ID :" + queueData[0][1]
        ); // info -> debug
        value = queueData[0][1];
      }
      return value;
    }
  };

  /**
   * @instance Dequeue one queue data selected.
   *
   * @param {key} param of queue data ID .
   *
   * @returns queue data by specified key .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.dequeueOne = function (key, callback) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var value = null;
      if (localStorage.length > 0) {
        var keyJSON = JSON.stringify(["queue", key]);
        var valueJSON = localStorage.getItem(keyJSON);
        if (valueJSON !== null) {
          value = eval("(" + valueJSON + ")");
          debugLog.debug("From LocalStorage get with queue ID :" + key);
        }
      }
      return value;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var value = null;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectQueueDataByKey", [key], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len !== 0) {
              value = eval("(" + results.rows.item(0).valueData + ")");
            } else {
              debugLog.debug("Not found :" + key);
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite get queue ID");
          callback(value);
        },
        function successCB() {
          debugLog.debug("SQLite get queue ID:" + key);
          callback(value);
        }
      );
    }
    // Memmory
    else {
      var value = null;
      if (queueData.length > 0) {
        for (var i = 0, len = queueData.length; i < len; i++) {
          if (queueData[i][0] === key) {
            value = queueData[i][1];
            break;
          }
        }
        debugLog.debug("From Memory get with queue ID :" + key);
      }
      return value;
    }
  };

  /**
   * @instance Dequeue all data of queue.
   *
   * @returns array list of all queue data .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.dequeueAll = function (callback) {
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var queueList = [];
      if (localStorage.length > 0) {
        var keyJSON, valueJSON, value;
        var keyList = [];
        for (var i = 0, len = localStorage.length; i < len; i++) {
          keyJSON = localStorage.key(i);
          if (keyJSON !== null) {
            keyList = eval("(" + keyJSON + ")");
            if (keyList[0] === "queue") {
              valueJSON = localStorage.getItem(keyJSON);
              value = eval("(" + valueJSON + ")");
              queueList.push([keyList[1], value]);
            }
          } else {
            break;
          }
        }
        debugLog.debug("From LocalStorage get all queue data");
      }
      return queueList;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var queueList = [];
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectAllQueueData", [], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len !== 0) {
              for (var i = 0; i < len; i++) {
                queueList.push([
                  results.rows.item(i).keyData,
                  eval("(" + results.rows.item(i).valueData + ")")
                ]);
              }
            } else {
              debugLog.debug("Not found ");
            }
          });
        },
        function errorCB(res) {
          debugLog.debug("Error SQLite get all queue");
          callback(queueList);
        },
        function successCB() {
          debugLog.debug("SQLite get all queue");
          callback(queueList);
        }
      );
    } else {
      var responseQueueData = [];
      return $.extend(responseQueueData, queueData); //return "refer" -> "parameter"
    }
  };

  /**
   * @instance Delete one queue data selected.
   *
   * @param {key} param of queue data ID .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.removeQueue = function (key, callback) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var result = false;
      if (localStorage.length !== 0) {
        var keyJSON = JSON.stringify(["queue", key]);
        if (localStorage.getItem(keyJSON) !== null) {
          localStorage.removeItem(keyJSON);
          debugLog.debug("From LocalStorage delete with queue ID :" + key);
          result = true;
        }
      }
      return result;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.deleteSQL("deleteQueueDataByKey", [key], null);
        },
        function errorCB() {
          debugLog.debug("Error SQLite delete queue ID");
          callback(false);
        },
        function successCB() {
          debugLog.debug("SQLite delete queue ID:" + key);
          callback(true);
        }
      );
    }
    // Memmory
    else {
      var result = false;
      if (queueData.length !== 0) {
        for (var i = 0, len = queueData.length; i < len; i++) {
          if (queueData[i][0] === key) {
            queueData.splice(i, 1);
            debugLog.debug("From Memory delete with queue ID :" + key);
            result = true;
            break;
          }
        }
      }
      return result;
    }
  };

  /**
   * @instance Delete all data of queue.
   *
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.removeQueueAll = function () {
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON = null;
      var keyList = "";
      var removeKeyList = [];
      var removeKey = "";
      for (var i = 0, len = localStorage.length; i < len; i++) {
        keyJSON = localStorage.key(i);
        if (keyJSON !== null) {
          keyList = eval("(" + keyJSON + ")");
          if (keyList[0] === "queue") {
            removeKeyList.push(keyJSON);
          }
        }
      }
      for (var j = 0, num = removeKeyList.length; j < num; j++) {
        removeKey = removeKeyList[j];
        localStorage.removeItem(removeKey);
      }
      debugLog.debug("From LocalStorage delete all queue data");
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.deleteSQL("deleteAllQueueData", [], null);
        },
        function errorCB() {
          debugLog.debug("Error SQLite delete all ");
        },
        function successCB() {
          debugLog.debug("SQLite delete queue all ");
        }
      );
    }
    // Memmory
    else {
      queueData.length = 0;
      debugLog.debug("From Memory delete all queue data");
    }
  };

  /**
   * @instance Get the number of queue data.
   *
   * @returns count of queue data .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvQueue.getQueueSize = function (callback) {
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var size = 0;
      var keyJSON = null;
      for (var i = 0, len = localStorage.length; i < len; i++) {
        keyJSON = localStorage.key(i);
        if (keyJSON !== null) {
          var keyList = null;
          keyList = eval("(" + keyJSON + ")");
          if (keyList[0] === "queue") {
            size++;
          }
        } else {
          break;
        }
      }
      debugLog.debug("From LocalStorage get queue data count :" + size);
      return size;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var size = 0;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectNumberQueueData", [], function (
            subTrans,
            results
          ) {
            debugLog.debug(
              "Return data of getQueueSize:" + JSON.stringify(results)
            );
            size = results.rows.item(0).queueSize;
          });
        },
        function errorCB(error) {
          debugLog.debug("Error SQLite get size queue");
          callback(size);
        },
        function successCB() {
          debugLog.debug("SQLite get size queue");
          callback(size);
        }
      );
    }
    // Memmory
    else {
      size = queueData.length;
      debugLog.debug("From Memory get queue data count :" + size);
      return size;
    }
  };
  return StvQueue;
})();

/**
 * @class The class of manage failure request data list.
 *
 * @since Staveware Mobile for Hybrid / Core Ver.4.0
 */
var StvFailureListManager = (function () {
  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);
  var failureData = [];
  var policy = StvMobileUtil.getPolicy();
  var stvdao = null;

  /**
   * Constructor of StvFailureListManager .
   * @constructor
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  var StvFailureListManager = function StvFailureListManager() {};

  /**
   * @instance initialize stvdao for StvFailureListManager.
   *
   * @param {stvDAO} stvdao object
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.init = function (stvDAO) {
    this.stvdao = stvDAO;
  };

  /**
   * @instance Add failure request data.
   *
   * @param {key} param of queue data ID .
   * @param {requestData} object of request information .
   * @param {error} param of request error contents .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.pushFailureData = function (key, requestData, error) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    if (requestData === null) {
      throw new IllegalArgumentException("can not set request data of null .");
    }
    if (requestData === undefined) {
      throw new IllegalArgumentException(
        "can not set request data of undefined ."
      );
    }
    if (error === null) {
      throw new IllegalArgumentException("can not set request data of null .");
    }
    if (error === undefined) {
      throw new IllegalArgumentException(
        "can not set request data of undefined ."
      );
    }
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON = JSON.stringify(["failure", key]);
      var dataJSON = JSON.stringify([requestData, error]);
      if (localStorage.getItem(keyJSON) === null) {
        localStorage.setItem(keyJSON, dataJSON);
        debugLog.debug("LocalStorage added failure data ID :" + key);
      } else {
        throw new IllegalArgumentException(
          "The key has already been registered ."
        );
      }
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var dataJSON = JSON.stringify([requestData, error]);
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectFailureDataByKey", [key], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len === 0) {
              subTrans.insertSQL(
                "insertFailureData", [key, dataJSON],
                null,
                null
              );
            } else {
              throw new IllegalArgumentException(
                "The key has already been registered ."
              );
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite add failure ID");
        },
        function successCB() {
          debugLog.debug("SQLite added failure ID:" + key);
        }
      );
    }
    // Memmory
    else {
      for (var i = 0, len = failureData.length; i < len; i++) {
        if (failureData[i][0] === key) {
          throw new IllegalArgumentException(
            "The key has already been registered ."
          );
        }
      }
      failureData.push([key, [requestData, error]]);
      debugLog.debug("Memory added failure data ID :" + key);
    }
  };

  /**
   * @instance Get failure request data selected.
   *
   * @param {key} param of queue data ID .
   * @returns queue data by specified key .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.popFailureData = function (key, callback) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var value = null;
      if (localStorage.length > 0) {
        var keyJSON = JSON.stringify(["failure", key]);
        var FailureDataJSON = localStorage.getItem(keyJSON);
        debugLog.debug("From LocalStorage get with failure data ID :" + key);
        if (FailureDataJSON !== null) {
          value = eval("(" + FailureDataJSON + ")");
        }
      }
      return value;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var value = null;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectFailureDataByKey", [key], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len !== 0) {
              value = eval("(" + results.rows.item(0).valueData + ")");
            } else {
              debugLog.debug("Not found :" + key);
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite get failure ID");
          callback(value);
        },
        function successCB() {
          debugLog.debug("SQLite get failure ID:" + key);
          callback(value);
        }
      );
    }
    // Memmory
    else {
      var value = null;
      if (failureData.length > 0) {
        for (var i = 0, len = failureData.length; i < len; i++) {
          if (failureData[i][0] === key) {
            value = failureData[i][1];
          }
        }
        debugLog.debug("From Memory get with failure data ID :" + key);
      }
      return value;
    }
  };

  /**
   * @instance Get failure request data list.
   *
   * @returns array list of all failure data .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.popFailureList = function (callback) {
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON, valueJSON, value;
      var keyList = [];
      var failureList = [];
      if (localStorage.length > 0) {
        for (var i = 0, len = localStorage.length; i < len; i++) {
          keyJSON = localStorage.key(i);
          if (keyJSON !== null) {
            keyList = eval("(" + keyJSON + ")");
            debugLog.debug("From LocalStorage get all queue data");
            if (keyList[0] === "failure") {
              valueJSON = localStorage.getItem(keyJSON);
              if (valueJSON !== null) {
                value = eval("(" + valueJSON + ")");
                failureList.push([keyList[1], value]);
              }
            }
          } else {
            break;
          }
        }
        debugLog.debug("From LocalStorage get all failure data");
      }
      return failureList;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var failureList = [];
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectAllFailureData", [], function (
            subTrans,
            results
          ) {
            var len = results.rows.length;
            if (len !== 0) {
              for (var i = 0; i < len; i++) {
                failureList.push([
                  results.rows.item(i).keyData,
                  eval("(" + results.rows.item(i).valueData + ")")
                ]);
              }
            } else {
              debugLog.debug("Not found ");
            }
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite select all fail data");
          callback(failureList);
        },
        function successCB() {
          debugLog.debug("SQLite select all fail data");
          callback(failureList);
        }
      );
    }
    // Memmory
    else {
      debugLog.debug("From Memory get all failure data");
      var responseQueueData = [];
      return $.extend(responseQueueData, failureData); //return "refer" -> "parameter"
    }
  };

  /**
   * @instance Delete failure request data selected.
   *
   * @param {key} param of queue data ID .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.deleteFailureData = function (key, callback) {
    if (key === null) {
      throw new IllegalArgumentException("can not set key of null .");
    }
    if (key === undefined) {
      throw new IllegalArgumentException("can not set key of undefined .");
    }
    if (key === "") {
      throw new IllegalArgumentException("can not set empty key .");
    }
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var value = false;
      var keyJSON = JSON.stringify(["failure", key]);
      if (localStorage.getItem(keyJSON) !== null) {
        localStorage.removeItem(keyJSON);
        value = true;
      }
      return value;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.deleteSQL("deleteFailureDataByKey", [key], null);
        },
        function errorCB() {
          debugLog.debug("Error SQLite delete failure ID");
          callback(false);
        },
        function successCB() {
          debugLog.debug("SQLite delete failure ID:" + key);
          callback(true);
        }
      );
    }
    // Memmory
    else {
      var value = false;
      if (failureData.length !== 0) {
        for (var i = 0, len = failureData.length; i < len; i++) {
          if (failureData[i][0] === key) {
            failureData.splice(i, 1);
            value = true;
          }
        }
      }
      return value;
    }
  };

  /**
   * @instance Delete failure request data list.
   *
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.deleteFailureList = function () {
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      var keyJSON;
      var keyset;
      for (var i = 0, len = localStorage.length; i < len; i++) {
        keyJSON = localStorage.key(i);
        if (keyJSON !== null) {
          keyset = eval("(" + keyJSON + ")");
          if (keyset[0] === "failure") {
            localStorage.removeItem(keyJSON);
          }
        } else {
          break;
        }
      }
      debugLog.debug("From LocalStorage delete all failure data");
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      _this.stvdao.transaction(
        function (trans) {
          trans.deleteSQL("deleteAllFailureData", [], null);
        },
        function errorCB() {
          debugLog.debug("Error SQLite delete all ");
        },
        function successCB() {
          debugLog.debug("SQLite delete failure all ");
        }
      );
    }
    // Memmory
    else {
      failureData.length = 0;
      debugLog.debug("From Memory delete all failure data");
    }
  };

  /**
   * @instance Get the number of failure data.
   *
   * @returns count of failure data .
   * @since Staveware Mobile for Hybrid / Core Ver.4.0
   */
  StvFailureListManager.getFailureListSize = function (callback) {
    var size = 0;
    // WebStorage
    if (policy === StvMobileConst.StoragePolicy.POLICY_WEBSTORAGE) {
      if (localStorage.length !== 0) {
        for (var i = 0, len = localStorage.length; i < len; i++) {
          var keyJSON = null;
          keyJSON = localStorage.key(i);
          if (keyJSON !== null) {
            var keyList = null;
            keyList = eval("(" + keyJSON + ")");
            if (keyList[0] === "failure") {
              size++;
            }
          } else {
            break;
          }
        }
      }
      debugLog.debug("From LocalStorage get failure data count :" + size);
      return size;
    }
    // TSDV updated for storing by SQLite DB
    else if (policy === StvMobileConst.StoragePolicy.POLICY_SQLITE) {
      var _this = this;
      var size = 0;
      _this.stvdao.transaction(
        function (trans) {
          trans.selectSQL("selectNumberFailureData", [], function (
            subTrans,
            results
          ) {
            //size = results.rows.length;
            size = results.rows.item(0).failSize;
          });
        },
        function errorCB() {
          debugLog.debug("Error SQLite get all ");
          callback(size);
        },
        function successCB() {
          debugLog.debug("SQLite get failure all ");
          callback(size);
        }
      );
    }
    // Memmory
    else {
      size = failureData.length;
      debugLog.debug("From Memory get failure data count :" + size);
      return size;
    }
  };
  return StvFailureListManager;
})();

/**
 * This function is automatic send queue request when change network mode from offline to online.
 * 
 *@since Staveware Mobile for Hybrid / Core ver.4.0.1
 */
document.addEventListener("deviceready", function () {
  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);
  document.addEventListener("online", function () {
    if (StvMobileUtil.isAddOnlineEvent() == true) {
      var networkInfo = navigator.connection.type;
      if (networkInfo === Connection.CELL_3G ||
        networkInfo === Connection.CELL_4G ||
        networkInfo === Connection.WIFI) {
        debugLog.debug("Device network change [Offline -> Online]");
        StvMobileUtil.setNetworkState(networkInfo);
        if (StvMobileUtil.getRequestType() === StvMobileConst.RequestType.SYNC) {
          StvRequestManager.retryRequestSync();
        } else {
          StvRequestManager.retryRequest();
        }
      }
    }
  }, false);
  document.addEventListener("offline", function () {
    var networkInfo = navigator.connection.type;
    if (networkInfo === Connection.NONE) {
      debugLog.debug("Device network change [Online -> Offline]");
      StvMobileUtil.setNetworkState(Connection.NONE);
    }
  }, false);
}, false);