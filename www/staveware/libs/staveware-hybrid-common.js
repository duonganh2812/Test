/**
 * @(#)staveware-hybrid-common.js：ver.4.1.1
 * © 2018-2019 Toshiba Digital Solutions Corporation
 */

function generateClass(newObjectName, superObject, constructor) {
  if (arguments.length == 0) {
    throw "Parameter[newObjectName] is null";
  }

  if (typeof newObjectName != "string") {
    throw "Parameter[newObjectName] must be a string";
  } else {
    var newName = newObjectName.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
    if (newName.length == 0) {
      throw "Parameter[newObjectName] is null";
    }
  }

  if (arguments.length > 1) {
    if (typeof superObject != "function") {
      throw "Parameter[superObject] must be a function";
    }
  }

  if (constructor && typeof constructor != "function") {
    throw "Parameter[constructor] must be a function";
  }

  if (arguments.length == 1) {
    superObject = Object;
  }

  var Class = function () {
    if (this.init) {
      this.init.apply(this, arguments);
    }
  };

  Class.superClass = superObject;
  Class.newInstance = function () {
    return new Class();
  };

  var superClassInstance;
  if (superObject.newInstance) {
    superClassInstance = superObject.newInstance();
  } else {
    superClassInstance = new superObject();
  }

  Class.prototype = superClassInstance;
  Class.prototype.construtor = Class;
  Class.prototype.name = newObjectName;

  if (!Class.prototype.toString) {
    Class.prototype.toString = function () {
      return Class.name;
    };
  }

  if (!Class.prototype.init) {
    Class.prototype.init = function () {};
  }

  if (constructor) {
    constructor(Class.prototype, function (_me) {
      var proxy = {};
      var ancientInstance = superObject.prototype;

      for (var node in ancientInstance) {
        if (typeof ancientInstance[node] == "function") {
          proxy[node] = function () {
            var func = arguments.callee;
            return ancientInstance[func.method].apply(_me, arguments);
          };
          proxy[node].method = node;
        }
      }

      return proxy;
    });
  }

  window[newObjectName] = Class;

  return Class;
}

generateClass("Exception", Error, function (_me, _superclass) {
  _me.name = null;
  _me.message = null;
  _me.trace = null;

  _me.init = function (message, trace) {
    _superclass(this).constructor(message);
    this.name = "Exception";
    this.message = message;
    this.trace = trace;
  };

  _me.toString = function () {
    var msg = this.name + "[LINE:" + this.lineNumber + "]: " + this.message;
    return msg;
  };

  _me.toTraceString = function () {
    var msg = this.toString();

    if (this.trace) {
      var mt = this.trace.toTraceString();
      msg = msg.concat("\n", mt);
    }

    return msg;
  };
});

generateClass("IllegalArgumentException", Exception, function (
  _me,
  _superclass
) {
  _me.init = function (message, trace) {
    this.name = "IllegalArgumentException";
    this.message = message;
    this.trace = trace;
  };
});

generateClass("ElementNotFoundException", Exception, function (
  _me,
  _superclass
) {
  _me.init = function (message, trace) {
    this.name = "ElementNotFoundException";
    this.message = message;
    this.trace = trace;
  };
});

function AsyncConstant() {}

AsyncConstant.clInputCheckOutputType = {
  ELEMENT: "element",
  MESSAGE_AREA: "errorMsgArea",
  DIALOG: "dialog"
};

AsyncConstant.inputCheckOutputType = {
  ELEMENT: "element",
  MESSAGE_AREA: "errorMsgArea",
  DIALOG: "dialog"
};

AsyncConstant.disabledType = {
  ELEMENT: "element",
  ALL: "all"
};

AsyncConstant.feedbackType = {
  ELEMENT: "element",
  FEEDBACK_AREA: "feedbackArea",
  CENTER: "center"
};

AsyncConstant.exceptionType = {
  EXCEPTION_AREA: "exceptionArea",
  DIALOG: "dialog"
};

AsyncConstant.confirmDialog = {
  ON: "on",
  OFF: "off"
};

AsyncConstant.checkType = {
  ON: "on",
  OFF: "off"
};

AsyncConstant.clientType = "ajax";
AsyncConstant.contentType = "application/json";
AsyncConstant.dataType = "json";
AsyncConstant.processData = false;
AsyncConstant.type = "POST";

function Config() {
  this.clInputCheckOutputType = AsyncConstant.clInputCheckOutputType.DIALOG;

  this.inputCheckOutputType = AsyncConstant.inputCheckOutputType.DIALOG;

  this.disabledType = null;

  this.feedbackType = null;

  this.exceptionType = AsyncConstant.exceptionType.DIALOG;

  this.confirmDialog = AsyncConstant.confirmDialog.ON;

  this.feedback = "";

  this.confirmMessage = null;
}

//-------------------------------------------------------------------------------------------------

generateClass("AbsAsyncRequest", Object, function (_me, _superclass) {
  _me.config = null;

  _me.init = function () {
    this.config = new Config();
  };

  _me.defaultClInputErrFunc = function (errorObject, thisObj) {
    if (!errorObject) {
      return;
    }

    var errorBasicObject = new Array();
    if (!errorObject.fieldErrors) {
      return;
    }
    for (var node in errorObject.fieldErrors) {
      var errorObject_New = new Object();
      errorObject_New.id = node;
      errorObject_New.errorMsg = errorObject.fieldErrors[node];
      errorBasicObject.push(errorObject_New);
    }
    errorObject = errorBasicObject;

    var msg = "";
    var length = "";
    var element = "";

    if (
      thisObj.config.clInputCheckOutputType ==
      AsyncConstant.clInputCheckOutputType.ELEMENT ||
      !thisObj.config.clInputCheckOutputType
    ) {
      length = errorObject.length;
      for (var i = 0; i < length; i++) {
        element = document.getElementById(errorObject[i].id + ".errorMsg");
        if (element) {
          element.innerHTML = errorObject[i].errorMsg;
          AbsAsyncRequest.preErrorIdList.push(errorObject[i].id + ".errorMsg");
        } else {
          msg += errorObject[i].errorMsg + "\n";
        }
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
    } else if (
      thisObj.config.clInputCheckOutputType ==
      AsyncConstant.clInputCheckOutputType.MESSAGE_AREA
    ) {
      length = errorObject.length;
      element = document.getElementById("errorMsgArea");
      for (var j = 0; j < length; j++) {
        if (element) {
          element.innerHTML += errorObject[j].errorMsg + "<br>";
        } else {
          msg += errorObject[j].errorMsg + "\n";
        }
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
      if (element) {
        AbsAsyncRequest.preErrorIdList.push("errorMsgArea");
      }
    } else if (
      thisObj.config.clInputCheckOutputType ==
      AsyncConstant.clInputCheckOutputType.DIALOG
    ) {
      length = errorObject.length;
      for (var k = 0; k < length; k++) {
        msg += errorObject[k].errorMsg + "\n";
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
    }
  };

  _me.defaultInputErrFunc = function (errorObject, thisObj) {
    if (!errorObject) {
      return;
    }

    var errorBasicObject = new Array();
    if (!errorObject.fieldErrors) {
      return;
    }
    for (var node in errorObject.fieldErrors) {
      var errorObject_New = new Object();
      errorObject_New.id = node;
      errorObject_New.errorMsg = errorObject.fieldErrors[node];
      errorBasicObject.push(errorObject_New);
    }
    errorObject = errorBasicObject;

    var msg = "";
    var length = "";
    var element = "";

    if (
      thisObj.config.inputCheckOutputType ==
      AsyncConstant.inputCheckOutputType.ELEMENT ||
      !thisObj.config.inputCheckOutputType
    ) {
      length = errorObject.length;
      for (var i = 0; i < length; i++) {
        element = document.getElementById(errorObject[i].id + ".errorMsg");
        if (element) {
          element.innerHTML = errorObject[i].errorMsg;
          AbsAsyncRequest.preErrorIdList.push(errorObject[i].id + ".errorMsg");
        } else {
          msg += errorObject[i].errorMsg + "\n";
        }
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
    } else if (
      thisObj.config.inputCheckOutputType ==
      AsyncConstant.inputCheckOutputType.MESSAGE_AREA
    ) {
      length = errorObject.length;
      element = document.getElementById("errorMsgArea");
      for (var j = 0; j < length; j++) {
        if (element) {
          element.innerHTML += errorObject[j].errorMsg + "<br>";
        } else {
          msg += errorObject[j].errorMsg + "\n";
        }
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
      if (element) {
        AbsAsyncRequest.preErrorIdList.push("errorMsgArea");
      }
    } else if (
      thisObj.config.inputCheckOutputType ==
      AsyncConstant.inputCheckOutputType.DIALOG
    ) {
      length = errorObject.length;
      for (var k = 0; k < length; k++) {
        msg += errorObject[k].errorMsg + "\n";
      }
      if (msg) {
        msg = msg.replace(/<br>/g, "\n");
        alert(msg);
      }
    }
  };

  _me.defaultErrorFunc = function (exceptionObject, thisObj) {
    if (
      !thisObj.config.exceptionType ||
      thisObj.config.exceptionType == AsyncConstant.exceptionType.DIALOG
    ) {
      alert(exceptionObject.message);
    } else if (
      thisObj.config.exceptionType == AsyncConstant.exceptionType.EXCEPTION_AREA
    ) {
      var element = document.getElementById("exceptionArea");
      if (element) {
        element.innerHTML = exceptionObject.message;
        AbsAsyncRequest.preErrorIdList.push("exceptionArea");
      }
    }
  };

  _me.setDisable = function (disabledList) {
    var oldScreenHeight = 0;
    var oldScreenWidth = 0;
    var element = "";

    if (
      this.config.disabledType == AsyncConstant.disabledType.ELEMENT ||
      !this.config.disabledType
    ) {
      if (disabledList) {
        var length = disabledList.length;
        for (var i = 0; i < length; i++) {
          element = document.getElementById(disabledList[i]);
          if (element) {
            element.disabled = true;
          }
        }
      }
    } else if (this.config.disabledType == AsyncConstant.disabledType.ALL) {
      element = document.getElementById("asyncDisabledZone");
      if (!element) {
        element = document.createElement("div");
        element.id = "asyncDisabledZone";
        element.style.zIndex = 0x7fffffff;
        document.body.appendChild(element);
      }
      element.style.position = "absolute";
      element.style.left = 0 + "px";
      element.style.top = 0 + "px";
      var elementHeightHTML =
        document.body.clientHeight > document.body.scrollHeight ?
        document.body.clientHeight :
        document.body.scrollHeight;
      var elementWidthHTML =
        document.body.clientWidth > document.body.scrollWidth ?
        document.body.clientWidth :
        document.body.scrollWidth;
      var elementHeightXHTML =
        document.documentElement.clientHeight >
        document.documentElement.scrollHeight ?
        document.documentElement.clientHeight :
        document.documentElement.scrollHeight;
      var elementWidthXHTML =
        document.documentElement.clientWidth >
        document.documentElement.scrollWidth ?
        document.documentElement.clientWidth :
        document.documentElement.scrollWidth;

      var elementHeight =
        document.compatMode && document.compatMode.toLowerCase() == "css1compat" ?
        elementHeightXHTML :
        elementHeightHTML;
      var elementWidth =
        document.compatMode && document.compatMode.toLowerCase() == "css1compat" ?
        elementWidthXHTML :
        elementWidthHTML;

      element.style.height = elementHeight + "px";
      element.style.width = elementWidth + "px";
      element.style.backgroundColor = "#AABBCC";
      element.style.visibility = "visible";
      if ("Microsoft Internet Explorer" == navigator.appName) {
        element.style.filter = "Alpha(opacity=20)";
      } else {
        element.style.opacity = 0.2;
      }

      this.config.disabledHandler = function () {
        setTimeout(function () {
          if (element.style.backgroundColor != "") {
            var screenHeight =
              document.compatMode &&
              document.compatMode.toLowerCase() == "css1compat" ?
              document.documentElement.clientHeight :
              document.body.clientHeight;
            var screenWidth =
              document.compatMode &&
              document.compatMode.toLowerCase() == "css1compat" ?
              document.documentElement.clientWidth :
              document.body.clientWidth;
            if (
              oldScreenHeight != screenHeight ||
              oldScreenWidth != screenWidth
            ) {
              element.style.display = "none";
              var elementHeightHTML =
                document.body.clientHeight > document.body.scrollHeight ?
                document.body.clientHeight :
                document.body.scrollHeight;
              var elementWidthHTML =
                document.body.clientWidth > document.body.scrollWidth ?
                document.body.clientWidth :
                document.body.scrollWidth;
              var elementHeightXHTML =
                document.documentElement.clientHeight >
                document.documentElement.scrollHeight ?
                document.documentElement.clientHeight :
                document.documentElement.scrollHeight;
              var elementWidthXHTML =
                document.documentElement.clientWidth >
                document.documentElement.scrollWidth ?
                document.documentElement.clientWidth :
                document.documentElement.scrollWidth;
              var elementHeight =
                document.compatMode &&
                document.compatMode.toLowerCase() == "css1compat" ?
                elementHeightXHTML :
                elementHeightHTML;
              var elementWidth =
                document.compatMode &&
                document.compatMode.toLowerCase() == "css1compat" ?
                elementWidthXHTML :
                elementWidthHTML;

              element.style.height = elementHeight + "px";
              element.style.width = elementWidth + "px";
              element.style.display = "block";
              oldScreenHeight = screenHeight;
              oldScreenWidth = screenWidth;
            }
          }
        }, 1);
      };

      if ("Microsoft Internet Explorer" == navigator.appName) {
        window.attachEvent("onresize", this.config.disabledHandler);
        var selObjs = document.getElementsByTagName("select");
        var selObjsDisabled = new Array();
        for (var node in selObjs) {
          if (!selObjs[node].disabled) {
            selObjsDisabled.push(selObjs[node]);
            selObjs[node].disabled = true;
          }
        }
        this.config.selObjsDisabled = selObjsDisabled;
      } else {
        document.addEventListener("resize", this.config.disabledHandler, false);
      }
    }
  };

  _me.setEnable = function (disabledList) {
    var element = "";

    if (
      this.config.disabledType == AsyncConstant.disabledType.ELEMENT ||
      !this.config.disabledType
    ) {
      if (disabledList) {
        var length = disabledList.length;
        for (var i = 0; i < length; i++) {
          element = document.getElementById(disabledList[i]);
          if (element) {
            element.disabled = false;
          }
        }
      }
    } else if (this.config.disabledType == AsyncConstant.disabledType.ALL) {
      element = document.getElementById("asyncDisabledZone");
      if (element) {
        element.style.backgroundColor = "";
        element.style.visibility = "hidden";
        element.style.height = "0px";
        element.style.width = "0px";
        if ("Microsoft Internet Explorer" == navigator.appName) {
          window.detachEvent("onresize", this.config.disabledHandler);
          var selObjsDisabled = this.config.selObjsDisabled;
          for (var node in selObjsDisabled) {
            selObjsDisabled[node].disabled = false;
          }
        } else {
          window.removeEventListener(
            "resize",
            this.config.disabledHandler,
            false
          );
        }
      }
    }
  };

  _me.setFeedback = function (feedbackList) {
    var element = "";

    if (
      this.config.feedbackType == AsyncConstant.feedbackType.ELEMENT ||
      !this.config.feedbackType
    ) {
      if (feedbackList) {
        var length = feedbackList.length;
        for (var i = 0; i < length; i++) {
          element = document.getElementById(
            feedbackList[i] + ".asyncfeedback"
          );
          if (element) {
            element.innerHTML = this.config.feedback;
            element.style.visibility = "visible";
          }
        }
      }
    } else if (
      this.config.feedbackType == AsyncConstant.feedbackType.FEEDBACK_AREA
    ) {
      element = document.getElementById("asyncfeedbackArea");
      if (element) {
        element.innerHTML = this.config.feedback;
        element.style.visibility = "visible";
      }
    } else if (this.config.feedbackType == AsyncConstant.feedbackType.CENTER) {
      element = document.getElementById("asyncCenter");
      if (!element) {
        element = document.createElement("div");
        element.id = "asyncCenter";
        document.body.appendChild(element);
      }
      element.innerHTML = this.config.feedback;
      element.style.position = "absolute";
      element.style.backgroundColor = "#AABBCC";
      element.style.left =
        parseInt(document.body.clientWidth / 2 - element.clientWidth / 2) +
        "px";
      element.style.top =
        parseInt(document.body.clientHeight / 2 - element.clientHeight / 2) +
        "px";
      element.style.visibility = "visible";

      this.config.feedbackHandler = function () {
        element.style.left =
          parseInt(document.body.clientWidth / 2 - element.clientWidth / 2) +
          "px";
        element.style.top =
          parseInt(document.body.clientHeight / 2 - element.clientHeight / 2) +
          "px";
      };
      if ("Microsoft Internet Explorer" == navigator.appName) {
        window.attachEvent("onresize", this.config.feedbackHandler);
      } else {
        document.addEventListener("resize", this.config.feedbackHandler, false);
      }
    }
  };

  _me.unsetFeedback = function (feedbackList) {
    var element = "";

    if (
      this.config.feedbackType == AsyncConstant.feedbackType.ELEMENT ||
      !this.config.feedbackType
    ) {
      if (feedbackList) {
        var length = feedbackList.length;
        for (var i = 0; i < length; i++) {
          element = document.getElementById(
            feedbackList[i] + ".asyncfeedback"
          );
          if (element) {
            element.innerHTML = "";
          }
        }
      }
    } else if (
      this.config.feedbackType == AsyncConstant.feedbackType.FEEDBACK_AREA
    ) {
      element = document.getElementById("asyncfeedbackArea");
      if (element) {
        element.innerHTML = "";
      }
    } else if (this.config.feedbackType == AsyncConstant.feedbackType.CENTER) {
      element = document.getElementById("asyncCenter");
      if (element) {
        element.innerHTML = "";
        element.style.visibility = "hidden";
        if ("Microsoft Internet Explorer" == navigator.appName) {
          window.detachEvent("onresize", this.config.feedbackHandler);
        } else {
          window.removeEventListener(
            "resize",
            this.config.feedbackHandler,
            false
          );
        }
      }
    }
  };

  _me.getParamFromArguments = function (
    event,
    inputId,
    checkFlg,
    actionUrl,
    disabledList,
    feedbackList,
    clInputErrorFunc,
    inputErrorFunc,
    errorFunc,
    prevFunc,
    postFunc,
    initializeFlag,
    props,
    predatasetfunc,
    completefunc,
    clInputCheckFunc
  ) {
    var localParamsObj = {};

    if (
      !(
        this.config.clInputCheckOutputType ==
        AsyncConstant.clInputCheckOutputType.ELEMENT ||
        this.config.clInputCheckOutputType ==
        AsyncConstant.clInputCheckOutputType.MESSAGE_AREA ||
        this.config.clInputCheckOutputType ==
        AsyncConstant.clInputCheckOutputType.DIALOG
      ) &&
      this.config.clInputCheckOutputType
    ) {
      throw new Exception(
        "Invalid clInputCheckOutputType, please refer the AsyncConstant.clInputCheckOutputType."
      );
    }
    if (
      !(
        this.config.inputCheckOutputType ==
        AsyncConstant.inputCheckOutputType.ELEMENT ||
        this.config.inputCheckOutputType ==
        AsyncConstant.inputCheckOutputType.MESSAGE_AREA ||
        this.config.inputCheckOutputType ==
        AsyncConstant.inputCheckOutputType.DIALOG
      ) &&
      this.config.inputCheckOutputType
    ) {
      throw new Exception(
        "Invalid inputCheckOutputType, please refer the AsyncConstant.inputCheckOutputType."
      );
    }
    if (
      !(
        this.config.exceptionType ==
        AsyncConstant.exceptionType.EXCEPTION_AREA ||
        this.config.exceptionType == AsyncConstant.exceptionType.DIALOG
      ) &&
      this.config.exceptionType
    ) {
      throw new Exception(
        "Invalid exceptionType, please refer the AsyncConstant.exceptionType."
      );
    }
    if (
      !(
        this.config.disabledType == AsyncConstant.disabledType.ELEMENT ||
        this.config.disabledType == AsyncConstant.disabledType.ALL
      ) &&
      this.config.disabledType
    ) {
      throw new Exception(
        "Invalid disabledType, please refer the AsyncConstant.disabledType."
      );
    }
    if (
      !(
        this.config.feedbackType == AsyncConstant.feedbackType.ELEMENT ||
        this.config.feedbackType == AsyncConstant.feedbackType.FEEDBACK_AREA ||
        this.config.feedbackType == AsyncConstant.feedbackType.CENTER
      ) &&
      this.config.feedbackType
    ) {
      throw new Exception(
        "Invalid feedbackType, please refer the AsyncConstant.feedbackType."
      );
    }
    if (
      !(
        this.config.confirmDialog == AsyncConstant.confirmDialog.ON ||
        this.config.confirmDialog == AsyncConstant.confirmDialog.OFF
      ) &&
      this.config.confirmDialog
    ) {
      throw new Exception(
        "Invalid confirmDialog type, please refer the AsyncConstant.confirmDialog."
      );
    }

    if (event) {
      if ("object" == typeof event) {
        localParamsObj.event = event;
      } else {
        throw new IllegalArgumentException("The event is not a Object.");
      }
    }

    if (inputId) {
      if (inputId.join) {
        localParamsObj.inputId = inputId;
      } else {
        localParamsObj.inputId = [inputId];
      }
    }

    if (checkFlg) {
      if (typeof checkFlg == "string") {
        if (
          checkFlg == AsyncConstant.checkType.ON ||
          checkFlg == AsyncConstant.checkType.OFF
        ) {
          localParamsObj.checkFlg = checkFlg;
        } else {
          throw new IllegalArgumentException(
            "The checkFlg is not a on or off."
          );
        }
      } else {
        throw new IllegalArgumentException("The checkFlg is not a string.");
      }
    } else {
      localParamsObj.checkFlg = AsyncConstant.checkType.ON;
    }

    if (actionUrl) {
      if ("string" == typeof actionUrl) {
        localParamsObj.actionUrl = actionUrl;
      } else {
        throw new IllegalArgumentException("The actionUrl is not a String.");
      }
    }
    if (disabledList) {
      if (disabledList.join) {
        localParamsObj.disabledList = disabledList;
      } else if ("string" == typeof disabledList) {
        localParamsObj.disabledList = [disabledList];
      } else {
        throw new IllegalArgumentException(
          "The disabledList is not a Array or String."
        );
      }
    }
    if (feedbackList) {
      if (feedbackList.join) {
        localParamsObj.feedbackList = feedbackList;
      } else if ("string" == typeof feedbackList) {
        localParamsObj.feedbackList = [feedbackList];
      } else {
        throw new IllegalArgumentException(
          "The feedbackList is not a Array or String."
        );
      }
    }
    if (clInputErrorFunc) {
      if ("function" == typeof clInputErrorFunc) {
        localParamsObj.clInputErrorFunc = clInputErrorFunc;
      } else {
        throw new IllegalArgumentException(
          "The clInputErrorFunc is not a Function."
        );
      }
    } else {
      localParamsObj.clInputErrorFunc = this.defaultClInputErrFunc;
    }
    if (inputErrorFunc) {
      if ("function" == typeof inputErrorFunc) {
        localParamsObj.inputErrorFunc = inputErrorFunc;
      } else {
        throw new IllegalArgumentException(
          "The inputErrorFunc is not a Function."
        );
      }
    } else {
      localParamsObj.inputErrorFunc = this.defaultInputErrFunc;
    }
    if (errorFunc) {
      if ("function" == typeof errorFunc) {
        localParamsObj.errorFunc = errorFunc;
      } else {
        throw new IllegalArgumentException("The errorFunc is not a Function.");
      }
    } else {
      localParamsObj.errorFunc = this.defaultErrorFunc;
    }
    if (prevFunc) {
      if ("function" == typeof prevFunc) {
        localParamsObj.prevFunc = prevFunc;
      } else {
        throw new IllegalArgumentException("The prevFunc is not a Function.");
      }
    }
    if (postFunc) {
      if ("function" == typeof postFunc) {
        localParamsObj.postFunc = postFunc;
      } else {
        throw new IllegalArgumentException("The postFunc is not a Function.");
      }
    }
    if (initializeFlag) {
      if ("boolean" == typeof initializeFlag) {
        localParamsObj.initializeFlag = initializeFlag;
      } else {
        throw new IllegalArgumentException(
          "The initializeFlag is not a Boolean."
        );
      }
    }

    if (props) {
      if ("object" == typeof props) {
        localParamsObj.props = {};

        for (var prop in props) {
          if (props[prop] != null) {
            if (prop == "accepts") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "async") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "cache") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "contents") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "context") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "converters") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "crossDomain") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "dataFilter") {
              if ("function" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Function."
                );
              }
            } else if (prop == "global") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "headers") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "ifModified") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "isLocal") {
              if ("boolean" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Boolean."
                );
              }
            } else if (prop == "mimeType") {
              if ("string" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a String."
                );
              }
            } else if (prop == "password") {
              if ("string" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a String."
                );
              }
            } else if (prop == "statusCode") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else if (prop == "timeout") {
              if ("number" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Number."
                );
              }
            } else if (prop == "type") {
              if ("string" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a String."
                );
              }
            } else if (prop == "username") {
              if ("string" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a String."
                );
              }
            } else if (prop == "xhr") {
              if ("function" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Function."
                );
              }
            } else if (prop == "xhrFields") {
              if ("object" != typeof props[prop]) {
                throw new IllegalArgumentException(
                  "The " + prop + " of props is not a Object."
                );
              }
            } else {
              throw new IllegalArgumentException(
                "The " + prop + " of props is not a standard option."
              );
            }

            localParamsObj.props[prop] = props[prop];
          }
        }
      } else {
        throw new IllegalArgumentException("The props is not a Object.");
      }
    }
    if (predatasetfunc) {
      if ("function" == typeof predatasetfunc) {
        localParamsObj.predatasetfunc = predatasetfunc;
      } else {
        throw new IllegalArgumentException(
          "The predatasetfunc is not a Function."
        );
      }
    }
    if (completefunc) {
      if ("function" == typeof completefunc) {
        localParamsObj.completefunc = completefunc;
      } else {
        throw new IllegalArgumentException(
          "The completefunc is not a Function."
        );
      }
    }
    if (clInputCheckFunc) {
      if ("function" == typeof clInputCheckFunc) {
        localParamsObj.clInputCheckFunc = clInputCheckFunc;
      } else {
        throw new IllegalArgumentException(
          "The clInputCheckFunc is not a Function."
        );
      }
    }
    return localParamsObj;
  };

  _me.clearErrorInfos = function () {
    var length = AbsAsyncRequest.preErrorIdList.length;
    if (length > 0) {
      for (var i = 0; i < length; i++) {
        var element = document.getElementById(
          AbsAsyncRequest.preErrorIdList[i]
        );
        if (element) {
          element.innerHTML = "";
        }
      }
    }
  };

  _me.getAllHtmlElement = function (idList) {
    var jsonMap = new Object();
    var length = idList ? idList.length : 0;
    
    for (var i = 0; i < length; i++) {
      var obj = document.getElementById(extractId(idList[i]));
      if (obj) {
        var htmlElement = getHtmlElement(idList[i]);
        if (htmlElement) {
          if (htmlElement.join) {
            for (var j = 0; j < htmlElement.length; j++) {
              for (var key in htmlElement[j]) {
                jsonMap[key] = htmlElement[j][key];
              }
            }
          } else {
            for (var key2 in htmlElement) {
              jsonMap[key2] = htmlElement[key2];
            }
          }
        }
      }
    }
    return jsonMap;
  };

  _me.getCommunicationToken = function () {
    var communicationToken = "";
    var regexp = new RegExp("; JSESSIONID=([^;]*);");
    var match = ("; " + document.cookie + ";").match(regexp);
    if (match) {
      communicationToken = match[1];
    } else {
      var regex = new RegExp("[\\?&]JSESSIONID=([^&#]*)");
      match = regex.exec(window.location.href);
      if (match) {
        communicationToken = match[1];
      }
    }
    return communicationToken + "_" + new Date().getTime();
  };

  _me.ajaxProcess = function (
    eventId,
    token,
    actionUrl,
    jsonData,
    callbackObject
  ) {
    var conditionObj = new Object();
    conditionObj.eventId = eventId;
    conditionObj.clientType = AsyncConstant.clientType;
    conditionObj.communicationToken = token;

    var jsonBasicData = new Object();
    jsonBasicData.condition = conditionObj;
    jsonBasicData.data = jsonData;
    jsonBasicData = JSON.stringify(jsonBasicData);

    callbackObject.contentType = AsyncConstant.contentType;
    callbackObject.dataType = AsyncConstant.dataType;
    callbackObject.processData = AsyncConstant.processData;
    callbackObject.data = jsonBasicData;
    callbackObject.url = actionUrl;
    callbackObject.type = AsyncConstant.type;

    $.ajax(callbackObject);
  };
});

AbsAsyncRequest.preErrorIdList = new Array();

var StvLogFactory = (function () {
  var loggerMap = [];
  var loggerInstance = [];
  var isparse = false;

  function StvLogFactory() {
    throw new Exception(
      'StvLogFactory can"t invoke Constructor.' +
      "You must be used StvLogFactory#getLogger(name)."
    );
  }

  StvLogFactory.getLogger = function (name) {
    if (isparse === false) {
      parseLogMap();
      isparse = true;
    }
    if (name) {
      if (loggerInstance[name] && loggerMap[name]) {
        return loggerInstance[name];
      } else {
        if (loggerMap[name]) {
          var engineList = loggerMap[name].engine;
          var logLevel = loggerMap[name].logLevel;
          loggerInstance[name] = new StvLog(name, engineList, logLevel);
          return loggerInstance[name];
        }
      }
      return null;
    } else {
      throw new IllegalArgumentException(
        "Name of logger can not be null, empty or undefined."
      );
    }
  };

  var parseLogMap = function () {
    var xhttp = new XMLHttpRequest();
    var source = window.location.href;
    var elemsource = source.split("/www/");
    var www = elemsource[0] + "/www";
    var path = www + "/staveware/" + "staveware-log.xml";
    xhttp.open("GET", path, false);
    xhttp.send(null);
    var xmlDoc = xhttp.responseXML;
    if (xmlDoc) {
      var engineMap = [];
      var elems = xmlDoc.getElementsByTagName("engine");
      var i;
      var elem;
      for (i = 0; i < elems.length; i++) {
        elem = elems[i];
        var engineName = elem.getAttribute("name");
        var engineClass = elem.getAttribute("class");
        engineMap[engineName] = engineClass;
      }
      elems = xmlDoc.getElementsByTagName("logger");
      var levelList = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
      for (i = 0; i < elems.length; i++) {
        elem = elems[i];
        var loggerName = elem.getAttribute("name");
        var loggerLogLevel = elem.getAttribute("logLevel");
        if (loggerLogLevel) {
          if (levelList.indexOf(loggerLogLevel.toUpperCase()) < 0) {
            throw new IllegalArgumentException(
              "Loglevel of logger " + loggerName + " is invalid."
            );
          }
        } else {
          loggerLogLevel = "info";
        }
        var childNodes = elem.childNodes;
        var engineList = [];
        for (var j = 0; j < childNodes.length; j++) {
          if (childNodes[j].nodeName === "engine-ref") {
            var engineN = childNodes[j].getAttribute("name");
            if (engineMap[engineN]) {
              engineList.push(engineMap[engineN]);
            }
          }
        }
        loggerMap[loggerName] = {
          logLevel: loggerLogLevel,
          engine: engineList
        };
      }
    } else {
      throw new IllegalArgumentException("Can not parse staveware-log.xml.");
    }
  };
  return StvLogFactory;
})();

generateClass("StvLog", Object, function (_me, _superclass) {
  _me.init = function (name, listEngineName, levelName) {
    if (!name || !listEngineName || !levelName) {
      throw new IllegalArgumentException(
        "logger name, list of engines and log level can not be null, undefined or empty."
      );
    }
    this.levelNameList = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];
    this.logLevel = this.levelNameList.indexOf(levelName.toUpperCase());
    this.logName = name;
    this.listEngineName = listEngineName;
    this.engineList = [];
    for (var i = 0; i < listEngineName.length; i++) {
      var isLogEngine = window[listEngineName[i]];
      if (isLogEngine && isLogEngine.superClass === StvLogEngine) {
        var engine = new window[listEngineName[i]](this.logName);
        this.engineList.push(engine);
      } else {
        throw new IllegalArgumentException(
          listEngineName[i] + " must be extended StvLogEngine class"
        );
      }
    }
  };

  _me.setLogLevel = function (level) {
    if (this.levelNameList[level]) {
      this.logLevel = level;
    }
  };

  _me.getLogLevel = function () {
    return this.logLevel;
  };

  _me.trace = function (message) {
    if (this.isTraceEnabled()) {
      this.log(StvLog.TRACE, message);
    }
  };
  _me.debug = function (message) {
    if (this.isDebugEnabled()) {
      this.log(StvLog.DEBUG, message);
    }
  };
  _me.info = function (message) {
    if (this.isInfoEnabled()) {
      this.log(StvLog.INFO, message);
    }
  };
  _me.warn = function (message) {
    if (this.isWarnEnabled()) {
      this.log(StvLog.WARN, message);
    }
  };
  _me.error = function (message) {
    if (this.isErrorEnabled()) {
      this.log(StvLog.ERROR, message);
    }
  };
  _me.fatal = function (message) {
    if (this.isFatalEnabled()) {
      this.log(StvLog.FATAL, message);
    }
  };

  _me.log = function (level, message) {
    var length = this.engineList.length;
    for (var i = 0; i < length; i++) {
      if (this.engineList[i].log) {
        if ("function" === typeof this.engineList[i].log) {
          this.engineList[i].log(level, message);
        } else {
          var nameEngine = this.listEngineName[i];
          throw new IllegalArgumentException(
            "log of " + nameEngine + " must be a function."
          );
        }
      }
    }
  };

  _me.isTraceEnabled = function () {
    return this.logLevel === StvLog.TRACE;
  };
  _me.isDebugEnabled = function () {
    return this.logLevel <= StvLog.DEBUG;
  };
  _me.isInfoEnabled = function () {
    return this.logLevel <= StvLog.INFO;
  };
  _me.isWarnEnabled = function () {
    return this.logLevel <= StvLog.WARN;
  };
  _me.isErrorEnabled = function () {
    return this.logLevel <= StvLog.ERROR;
  };
  _me.isFatalEnabled = function () {
    return this.logLevel <= StvLog.FATAL;
  };
});

StvLog.TRACE = 0;
StvLog.DEBUG = 1;
StvLog.INFO = 2;
StvLog.WARN = 3;
StvLog.ERROR = 4;
StvLog.FATAL = 5;
StvLog.LOG_NAME = "stv_hybrid";

generateClass("StvLogEngine", Object, function (_me, _superclass) {
  _me.init = function (logName) {
    this.logName = logName;
  };

  _me.log = function (level, message) {
    console.log(this.format(level, message));
  };

  _me.format = function (level, message) {
    var logMessage = "";
    logMessage += StvMobileUtil.createDate() + " ";
    logMessage += "[" + this.logName + "]" + " : ";
    logMessage += this.getLevelName(level) + " : ";
    logMessage += message;
    return logMessage;
  };

  _me.getLevelName = function (level) {
    var levelName = null;
    switch (level) {
      case StvLog.TRACE:
        levelName = "TRACE";
        break;
      case StvLog.DEBUG:
        levelName = "DEBUG";
        break;
      case StvLog.INFO:
        levelName = "INFO";
        break;
      case StvLog.WARN:
        levelName = "WARN";
        break;
      case StvLog.ERROR:
        levelName = "ERROR";
        break;
      case StvLog.FATAL:
        levelName = "FATAL";
        break;
    }
    return levelName;
  };
});

generateClass("StvConsoleLog", StvLogEngine, function (_me, _superclass) {
  _me.log = function (level, message) {
    console.log(this.format(level, message));
  };
});

generateClass("StvNativeLog", StvLogEngine, function (_me, _superclass) {
  _me.log = function (level, message) {
    cordova.exec(null, null, "StvNativeLogEngine", "printLog", [{
      logName: this.logName,
      level: level,
      message: message
    }]);
  };
});

/**
 * Constructs a new StvCommon object. < br >
 * @class
 * @classdesc This class is used to handle common function
 *
 * @version Staveware Mobile for Hybrid Ver.4.1
 * @return a new StvCommon instance
 */

var StvCommon = (function () {
  /**
   * Constructor. This should not be used.
   * @constructor StvCommon
   */
  var StvCommon = function StvCommon() {};

  /**
   * @init Log function
   */

  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);

  /**
   * @summary Check file is Exist

   * @function isFileExist
   * 
   * @param {string} filename
   * directory path of file name
   * 
   * @return {boolean} return true if file exist
   * 
   */

  StvCommon.isFileExist = function (fileName) {
        isFileExist = false;

        if ((fileName !== "") && (fileName !== null) && (fileName !== undefined)) {
            try {
                var xhttp = new XMLHttpRequest();
                xhttp.open("GET", fileName, false);
                xhttp.send(null);
                if (xhttp.responseText) {
                    isFileExist = true;
                }
            } catch (ex) {
                console.log(ex)
            }
        }
        return isFileExist;
    };

  /**
   * @summary This function is used to read data from json file
   * @function readJsonFile
   * @static
   *
   * @param {string} filePath
   * directory path of data json file
   *
   * @return {JsonObject} Json object
   *
   */

  StvCommon.readJsonFile = function (filePath) {
    if (filePath !== "" && filePath !== null && filePath != undefined) {
      var xhttp = new XMLHttpRequest();
      xhttp.open("GET", filePath, false);
      xhttp.send(null);
      var txtData = xhttp.responseText;
      if (txtData) {
        txtData = txtData.replace(/(\r\n|\n|\r|\t)/gm, " ");
        var jsonData = JSON.parse(txtData);
        if (jsonData instanceof Array) {
          return jsonData;
        } else {
          debugLog.error("Json data must be an array");
          throw new IllegalArgumentException("Json data must be an array");
        }
      } else {
        debugLog.error("Data in " + filePath + "is empty");
        throw new IllegalArgumentException("Data in " + filePath + "is empty");
      }
    } else {
      debugLog.error("file path must not null or empty or undefined");
      throw new IllegalArgumentException(
        "file path must not null or empty or undefined"
      );
    }
  };
  return StvCommon;
})();