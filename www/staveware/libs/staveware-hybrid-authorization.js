/**
 * @(#)staveware-hybrid-authorization.js：ver.4.1.1
 * © 2018-2019 Toshiba Digital Solutions Corporation
 *
 * Offline Authorization function.
 */

/**
 * Constructs a new StvAuthorize object.<br>
 * @class
 * @classdesc This class is used to offline authorization.
 *
 * @version Staveware Mobile for Hybrid Ver.4.1
 * @return a new StvAuthorize instance
 */

var StvAuthorize = (function () {

  /**
   * @userInfo is role of user
   */

  var userInfo = null;

  /**
   * @appPolicyConfig is saved from database. It using check policy
   */

  var appPolicyConfig = {};

  /**
   * Constructor. This should not be used.
   * @constructor StvAuthorize
   */

  var StvAuthorize = function StvAuthorize() {};

  /**
   * @init Log function
   */

  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);

  /**
   * @summary Set information of user in library
   *
   * @function setUserInfo
   * @static
   *
   * @param {string} info
   * information of user
   */

  StvAuthorize.setUserInfo = function (info) {
    userInfo = info;
  };

  /**
   * @summary Get all policy from database then validate it
   *
   * <ul style = "list-style: none;">
   * <li> • Get all policy from sqlite database
   * <li> • Set policy data to global variable
   * <li> • Validate policy data
   * <li> • Callback result is boolean type
   * </ul>
   * @function getPolicyWithValidate
   * @static
   * 
   * @param {object} stvDAO
   * Intance of StvDAO
   * @param {function} callback
   * Callback function 
   * 
   */

  StvAuthorize.getPolicyWithValidate = function (stvDAO, callback) {
    //GET ALL POLICY FROM DATABASE
    getAllPolicyFromDatabase(stvDAO, function (data) {
      var result = true;
      //SET POLICY DATA TO GLOBAL VARIABLE
      appPolicyConfig = data;
      var policyConfig = appPolicyConfig["PolicySet"]["Policy"];
      //VALIDATE POLICY
      let policyLength = policyConfig.length;
      if (policyLength > 0) {
        for (let i = 0; i < policyLength; i++) {
          if (!validatePolicy(policyConfig[i])) {
            appPolicyConfig = null;
            result = false;
          }
        }
      } else {
        debugLog.error("Policy get from database is empty");
        appPolicyConfig = null;
        result = false;
      }
      //RETURN INIT POLICY FAIL IF GET AND VALIDATE POLICY FAIL
      callback(result);
    });
  };

  /**
   * @summary Check policyId, resourceId, userInfo and condition map with policy.
   *
   * @function authorizeLogic
   * @static
   *
   * @param {string} policyId
   * Id of policy
   *
   * @param {string} resourceId
   * Id of resource
   * 
   * @param {Map} actionInfo
   * Infomation of action
   *
   * @return {boolean} True if policyId, resourceId, userInfo and today map with policy. Otherwise return false
   */

  StvAuthorize.authorizeLogic = function (policyId, resourceId, actionInfo) {
    var policyConfig = appPolicyConfig["PolicySet"]["Policy"];
    var result = false;
    if (policyConfig instanceof Array) {
      for (let i = 0; i < policyConfig.length; i++) {
        if (policyConfig[i] != null) {
          if (policyId === policyConfig[i]["policyId"]) {
            result = isRule(policyConfig[i]["Rule"], resourceId, actionInfo);
            result = isEffect(result, policyConfig[i]["effect"]);
            break;
          }
        }
      }
    } else if (policyConfig != null) {
      if (policyId === policyConfig["policyId"]) {
        result = isRule(policyConfig["Rule"], resourceId, actionInfo);
        result = isEffect(result, policyConfig["effect"]);
      }
    }
    return result;
  };

  /**
   * @summary Check imformation policy map with rule of policy in variable config
   *
   * @function isRule
   *
   * @param {Object|Array} ruleConfig
   * Object which convert from database
   * @param {string} resourceId
   * Identify of resource
   * @param {Map} actionInfo
   * Infomation of action
   * 
   * @return {boolean} checkRule is true if userInfo,resourceID, today map with one of rule
   */
  var isRule = function (ruleConfig, resourceId, actionInfo) {
    var checkRule = false;
    if (resourceId != undefined && resourceId != null) {
      if (!(ruleConfig instanceof Array)) {
        checkRule = isOneRule(ruleConfig, resourceId, actionInfo);
      } else {
        for (let i = 0; i < ruleConfig.length; i++) {
          checkRule = isOneRule(ruleConfig[i], resourceId, actionInfo);
          if (checkRule === true) {
            break;
          }
        }
      }
    }
    return checkRule;
  };

  /**
   * @summary Check a rule of user map with anyone rule in config file
   *
   * @function isOneRule
   *
   * @param {Object} rule
   * Rule of policy in config file
   * @param {String} resourceId
   * Identify of resource
   * @param {Map} actionInfo
   * Infomation of action
   *
   * @return {boolean} checkRule is true if userInfo,resourceID, today map with rule
   */

  var isOneRule = function (rule, resourceId, actionInfo) {
    var checkRule = (rule["Subject"] || rule["Resource"] || rule["Action"] || rule["Condition"]);

      if (rule["Subject"] && checkRule) {
        checkRule = isSubject(userInfo, rule["Subject"]);
      }
      if (rule["Resource"] && checkRule) {
        checkRule = isResource(resourceId, rule["Resource"]);
      }
      if (rule["Action"] && checkRule) {
        checkRule = isAction(actionInfo, rule["Action"]);
      }
      if (rule["Condition"] && checkRule) {
        checkRule = isCondition(rule["Condition"]);
      }

    return checkRule;
  };

  /**
   * @summary Check a userInfo with subjects of rule
   *
   * @function isSubject
   *
   * @param {string} userInfo
   * An information of user, for example username, role, companyId
   * @param {Object|Array} subjectConfig
   * Object which convert from table subject in database corresponding this rule
   *
   * @return {boolean} checkSubject is true if userInfo with all subject
   */

  var isSubject = function (userInfo, subjectConfig) {    
    var checkSubject = false;
    if (!(subjectConfig instanceof Array)) {
      checkSubject = isOneSubject(userInfo, subjectConfig);
    } else {
      for (let k = 0; k < subjectConfig.length; k++) {
        if (!isOneSubject(userInfo, subjectConfig[k])) {
          break;
        }
        if (k === subjectConfig.length - 1) {
          checkSubject = true;
        }
      }
    }
    return checkSubject;
  };

    /**
   * @summary Check a userInfo with anyone subject of rule
   *
   * @function isOneSubject
   *
   * @param {String} userInfo
   * An information of user, for example username, role, companyId
   * @param {Object} subjectConfig
   * A subject in some subjects in config file
   *
   * @return {boolean} checkSubject is true if userInfo is match with subject of rule
   */

  var isOneSubject = function (userInfo, subjectConfig) {
    var checkSubject = false;
    let splitValueOfSubject = convertValues(subjectConfig["value"]);
    if (Object.prototype.toString.call(userInfo) === "[object Map]") {
      for (let i = 0; i < splitValueOfSubject.length; i++) {
        var valueType = subjectConfig["valueType"];
        var values = userInfo.get(valueType);
        if (Object.prototype.toString.call(values) === "[object Set]") {
          for (let value of values) {
            checkSubject = evaluate(value, splitValueOfSubject[i].trim(), subjectConfig["evalType"]);
            if (checkSubject === true) {
              break;
            }
          }
          if (checkSubject === true) {
            break;
          }
        }
      }
    }
    return checkSubject;
  };

  /**
   * @summary Are more resourceId map with resourceId in config file
   *
   * @function isResource
   *
   * @param {String} resourceId
   * Identify of resource
   * @param {Object|Array} resourceConfig
   * Object which convert from table resource in database corresponding this rule
   *
   * @return {boolean} checkResource map with one of resource
   */

  var isResource = function (resourceId, resourceConfig) {
    var checkResource = false;
    if (!(resourceConfig instanceof Array)) {
      checkResource = isOneResource(resourceId, resourceConfig);
    } else {
      let count = 0;
      for (let k = 0; k < resourceConfig.length; k++) {
          if (!isOneResource(resourceId, resourceConfig[k])) {
            break;
          }
          if (k === resourceConfig.length - 1) {
            checkResource = true;
          }
        }

    }
    return checkResource;
  };

  /**
   * @summary Check a resource map with anyone resource in config file
   *
   * @function isOneResource
   *
   * @param {String} resourceId
   * Identify of a resource
   * @param {Object} resourceConfig
   * A resource in some resources in config file
   *
   * @return {boolean} checkResource map with resource
   */

  var isOneResource = function (resourceId, resourceConfig) {
    var checkResource = false;
    let listOfResource = convertValues(resourceConfig["value"]);
    for (let i = 0; i < listOfResource.length; i++) {
      listOfResource[i] = listOfResource[i].trim();
      checkResource = evaluate(resourceId, listOfResource[i], resourceConfig["evalType"]);
      if (checkResource === true) {
        break;
      }
    }
    return checkResource;
  };

  /**
   * @summary Are more action map with action in config file
   *
   * @function isAction
   *
   * @param {Map} actionInfo
   * Informatin of action
   * @param {Object|Array} actionConfig
   * Object which convert from table action in database corresponding this rule
   *
   * @return {boolean} checkAction map with one of action
   */

  var isAction = function (actionInfo, actionConfig) {
    var checkAction = false;

    if (!(actionConfig instanceof Array)) {
      checkAction = isOneAction(actionInfo, actionConfig);
    } else {
      let count = 0;
      for (let k = 0; k < actionConfig.length; k++) {
        if (isOneAction(actionInfo, actionConfig[k])) {
          checkAction = true;
          break;
        }
      }
    }

    return checkAction;
  };

   /**
   * @summary Check a action map with anyone action in config file
   *
   * @function isOneAction
   *
   * @param {Map} actionInfo
   * Information of action
   * 
   * @param {Object} actionConfig
   * A action in some actions in config file
   *
   * @return {boolean} checkAction map with action
   */
  var isOneAction = function (actionInfo, actionConfig) {
    var checkAction = false;
    var splitValueOfAction = convertValues(actionConfig["value"]);

    if (Object.prototype.toString.call(actionInfo) === "[object Map]") {
      for (let i = 0; i < splitValueOfAction.length; i++) {
        var valueType = actionConfig["valueType"];
        var values = actionInfo.get(valueType);
        if (Object.prototype.toString.call(values) === "[object Set]") {
          for (let value of values) {
            checkAction = evaluate(value, splitValueOfAction[i], actionConfig["evalType"]);
            if (checkAction === true) {
              break;
            }
          }
          if (checkAction === true) {
            break;
          }
        }
      }
    }

    return checkAction;
  };

  /**
   * @summary Is day or date map with day or date in config file
   *
   * @function isCondition
   *
   * @param {Object|Array} conditionConfig
   * Object which convert from table condition in database corresponding this rule
   *
   * @return {boolean} checkCondition is true if today map with one of condition
   */

  var isCondition = function (conditionConfig) {
    var checkCondition = false;
    if (!(conditionConfig instanceof Array)) {
      checkCondition = isOneCondition(conditionConfig);
    } else {
      let count = 0;
      for (let i = 0; i < conditionConfig.length; i++) {
        if (!isOneCondition(conditionConfig[i])) {
          checkCondition = false;
          break;
        } else {
          count++;
        }
      }
      if (count === conditionConfig.length) {
        checkCondition = true;
      }
    }
    return checkCondition;
  };

  /**
   * @summary Check a condition map with anyone condition in config file
   *
   * @function isOneCondition
   *
   * @param {string} aConditionConfig
   * A condition in some conditions in config file
   *
   * @return {boolean} checkCondition is true if today map with condition
   */

  var isOneCondition = function (aConditionConfig) {
    var checkOneCondition = false;
    if (aConditionConfig["valueType"].trim() == "week") {
      let dayConfig = aConditionConfig["value"].trim().split(",");
      dayConfig = dayConfig.map(str => str.trim());
      checkOneCondition = isDay(dayConfig);
    } else if (aConditionConfig["valueType"].trim() == "term") {
      let dateConfig = aConditionConfig["value"].trim().split("-");
      if (dateConfig[0].trim().length > 0 && dateConfig[1].trim().length === 0 && isDate(dateConfig[0]) === true) {
        checkOneCondition = true;
        return checkOneCondition;
      }
      if (dateConfig[0].trim().length === 0 && dateConfig[1].trim().length > 0 && isDate(dateConfig[1]) === false) {
        checkOneCondition = true;
        return checkOneCondition;
      }
      dateConfig = convertWildCardTerm(dateConfig);
      if (isDate(dateConfig[0]) == true && isDate(dateConfig[1]) == false) {
        checkOneCondition = true;
      }
    }
    return checkOneCondition;
  };

  /**
   * @summary Check now date map with date in config file
   *
   * @function isDate
   *
   * @param {string} dateConfig
   * dateConfig is time in config file
   *
   * @return {boolean} checkDate is true if today map value of condition with condition.valueType is term
   */

  var isDate = function (dateConfig) {
    var splitDate = dateConfig.split("/");
    var nowDate = new Date();
    var checkDate = false;
    var getTime = [nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), nowDate.getHours()];
    for (let i = 0; i < splitDate.length; i++) {
      if (getTime[i] > splitDate[i]) {
        checkDate = true;
        break;
      }
      if (getTime[i] < splitDate[i]) {
        checkDate = false;
        break;
      }
      if (i == 3) {
        checkDate = true;
        break;
      }
    }
    return checkDate;
  };

  /**
   * @summary Validate Date String. Check format strDate map format define in document(Ex, YYYY/MM/DD/YY, ...)
   *
   * @function validateDate
   *
   * @param {string} strDate
   * Date string
   *
   * @return {boolean} validateDate is true if strDate map with format date
   */

  var validateDate = function (strDate) {
    var result = false;
    var regexDate31 = /^(\d{4}|\*)\/(0[13578]|1[02]|\*)\/(0[1-9]|[12][0-9]|3[01]|\*)\/([01][0-9]|2[0123]|\*)$/;
    var regexDate30 = /^(\d{4}|\*)\/(0[469]|1[1]|\*)\/(0[1-9]|[12][0-9]|3[0]|\*)\/([01][0-9]|2[0123]|\*)$/;
    var regexDate2 = /^(\d{4}|\*)\/(02|\*)\/(0[1-9]|[1][0-9]|2[0-9]|\*)\/([01][0-9]|2[0123]|\*)$/;
    if (strDate.match(regexDate31) || strDate.match(regexDate30) || strDate.match(regexDate2)) {
      result = true;
    }
    var splitDate = strDate.split("/");

    if (splitDate[1] == 2 && splitDate[2] == 29 && result == true) {
      if (splitDate[0] % 4 != 0) {
        result = false;
      }
      if (splitDate[0] % 100 == 0 && splitDate[0] % 400 != 0) {
        result = false;
      }
    }

    // check wildcard format is head (ex. */*/DD/HH) or tail (ex. YYYY/MM/*/*)
    if (strDate.includes("\*")) {
      var regexWildCard = [
        /^\*\/\d{2}\/\d{2}\/\d{2}$/,
        /^\*\/\*\/\d{2}\/\d{2}$/,
        /^\*\/\*\/\*\/\d{2}$/,
        /^\d{4}\/\d{2}\/\d{2}\/\*$/,
        /^\d{4}\/\d{2}\/\*\/\*$/,
        /^\d{4}\/\*\/\*\/\*$/
      ];

      var isValidWildCard = false;
      for(let i = 0; i < regexWildCard.length; i++) {
        if(strDate.match(regexWildCard[i])) {
          isValidWildCard = true;
          break;
        }
      }

      if(!isValidWildCard) {
        result = false;
      }
    }

    return result;
  };

  /**
   * @summary validate wildcard format. 
   *          compare start value and end value, and check wildcard's position is same.
   *
   * @function validateWildCardDate
   *
   * @param {Array} dateConfig
   * Date string
   *
   * @return {boolean} true if dateConfig format is valid
   */

  var validateWildCardDate = function (dateConfig) {
    var start = dateConfig[0].split("/");
    var end = dateConfig[1].split("/");

    for (let i = 0; i < start.length; i++) {
      if ("*" === start[i]) {
        if ("*" !== end[i]) {
          return false;
        }
      } else {
        if ("*" === end[i]) {
          return false;
        }
      }
    }

    return true;
  };

  /**
   * @summary Validate Day String
   *
   * @function validateDay
   *
   * @param {Array} dayConfig
   * List of day in config file
   *
   * @return {boolean} validateDay is true if dayConfig map with format day
   */

  var validateDay = function (dayConfig) {
    var weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var count = 0;
    for (let i = 0; i < dayConfig.length; i++) {
      for (let j = 0; j < weekday.length; j++) {
        if (dayConfig[i] === weekday[j]) {
          count++;
          break;
        }
      }
    }
    if (count == dayConfig.length) {
      return true;
    }
    return false;
  };

  /**
   * @summary Check today map with day of week in config file
   *
   * @function isDay
   *
   * @param {Array} dayConfig
   * Variable dayConfig is list of day in week which define in config file
   *
   * @return {boolean} checkDay is true if today map value of condition with condition.valueType is week
   */

  var isDay = function (dayConfig) {
    var checkDay = false;
    var d = new Date();
    var weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var n = d.getDay();
    var day = weekday[n];
    for (let i = 0; i < dayConfig.length; i++) {
      if (day === dayConfig[i]) {
        checkDay = true;
        break;
      }
    }
    return checkDay;
  };

/**
   * @summary convert dateConfig contains wildcard to date string (yyyy/mm/dd/hh)
   *
   * @function convertWildCardTerm
   *
   * @param {Array} dateConfig
   * dateConfig is time in config file
   *
   * @return {Array} dateConfig converted wildcard to date string (yyyy/mm/dd/hh)
   */

  var convertWildCardTerm = function(dateConfig) {
    var start = dateConfig[0].split("/");
    var end = dateConfig[1].split("/");
    var nowDate = new Date();
    var current = [nowDate.getFullYear(), nowDate.getMonth() + 1, nowDate.getDate(), nowDate.getHours()];

    // check wildcard format is head (ex. */*/DD/HH-*/*/DD/HH) or tail (ex. YYYY/MM/*/*-YYYY/MM/*/*)
    var head = false;
    var tail = false;
    for (let i = 0; i < start.length; i++) {
      if ("*" === start[i] && !("*" === start[i+1])){
        head = true;
        break;
      } else if (!("*" === start[i]) && "*" === start[i+1]) {
        tail = true;
        break;
      }
    }

    if (head) {
      let startDate = setFowardDate(current, start);
      let endDate = setFowardDate(current, end);

      if (startDate.getTime() >= endDate.getTime()) {
        if (endDate.getTime() > nowDate) {
          startDate = subForwardDate(startDate, start);
        } else {
          endDate = addForwardDate(endDate, end);
        }
      }

      dateConfig[0] = createDateString(startDate);
      dateConfig[1] = createDateString(endDate);
    } else if (tail) {
      let startDate = setBackwardDate(start);
      let endDate = setBackwardDate(end);

      dateConfig[0] = createDateString(startDate);
      dateConfig[1] = createDateString(endDate);
    }

    return dateConfig;

  };

  /**
   * @summary convert the wild card which is forward in dateConfig into the dateElement.
   *
   * @function setFowardDate
   *
   * @param {Array} current
   * current is array contains current date elements
   * 
   * @param {Array} ruleValue
   * ruleValue is array contains date elements in config file
   *
   * @return {Date} object converted wildcard to date elements
   */
  
  var setFowardDate = function(current, ruleValue) {
    // set dumy data.
    var date = new Date(2000,0,1,0,0,0,0);

    // input year(must be current's year).
    date.setFullYear(current[0]);

    // input month.
    if ("*" === ruleValue[1]) {
      date.setMonth(current[1] - 1);
    } else {
      date.setMonth(ruleValue[1] -1);
    }

    // input day.
    if ("*" === ruleValue[2]) {
      date.setDate(current[2]);
    } else {
      date.setDate(ruleValue[2]);
    }

    // input hour(must be ruleValue's value).
    date.setHours(ruleValue[3]);

    return date;
  };

  /**
   * @summary convert the wild card which is backward in dateConfig into the dateElement.
   *
   * @function setBackwardDate
   *
   * @param {Array} ruleValue
   * ruleValue is array contains date elements in config file
   *
   * @return {Date} object converted wildcard to date elements
   */

  var setBackwardDate = function(ruleValue) {
    // set dumy data.
    var date = new Date(2000,0,1,0,0,0,0);

    // input year(must be ruleValue's year).
    date.setFullYear(ruleValue[0]);

    // input month.
    if ("*" === ruleValue[1]) {
      date.setMonth(0); // set January (Bottom Value)
    } else {
      date.setMonth(ruleValue[1] - 1);
    }

    // input day.
    if ("*" === ruleValue[2]) {
      date.setDate(1); // set 1st (Bottom Value)
    } else {
      date.setDate(ruleValue[2]);
    }

    // input hour(must be 1 (Bottom Value)).
    date.setHours(0);

    return date;
  };

  /**
   * @summary add 1 to an date element which wildcard is used in ruleValue;
   *
   * @function addForwardDate
   *
   * @param {Date} date
   * date is Date object
   * 
   * @param {Array} ruleValue
   * ruleValue is array contains date elements in config file
   *
   * @return {Date} object added 1 to an date element
   */
  
  var addForwardDate = function(date, ruleValue) {
    var wildcardOrder = 0;

    // specify wildcard bottom number.
    for (let i = ruleValue.length; i >= 0; i--) {
      if ("*" === ruleValue[i]) {
        wildcardOrder = i;
        break;
      }
    }

    if (wildcardOrder === 0) {
      date.setFullYear(date.getFullYear() + 1);
    } else if (wildcardOrder === 1) {
      date.setMonth(date.getMonth() + 1);
    } else if (wildcardOrder === 2) {
      date.setDate(date.getDate() + 1);
    }

    return date;
  };

  /**
   * @summary subtract 1 to an date element which wildcard is used in ruleValue;
   *
   * @function subForwardDate
   *
   * @param {Date} date
   * date is Date object
   * 
   * @param {Array} ruleValue
   * ruleValue is array contains date elements in config file
   *
   * @return {Date} object added 1 to an date element
   */

  var subForwardDate = function(date, ruleValue) {
    var wildcardOrder = 0;

    // specify wildcard bottom number.
    for (let i = ruleValue.length; i >= 0; i--) {
      if ("*" === ruleValue[i]) {
        wildcardOrder = i;
        break;
      }
    }

    if (wildcardOrder === 0) {
      date.setFullYear(date.getFullYear() - 1);
    } else if (wildcardOrder === 1) {
      date.setMonth(date.getMonth() - 1);
    } else if (wildcardOrder === 2) {
      date.setDate(date.getDate() - 1);
    }

    return date;
  };

  /**
   * @summary create date string from Date object
   *
   * @function createDateString
   *
   * @param {Date} date
   * date is Date object
   *
   * @return {String} date string
   */

  var createDateString = function(date) {
    var month = createDateElement((date.getMonth() + 1).toString());
    var day = createDateElement(date.getDate().toString());
    var hour = createDateElement(date.getHours().toString());

    return date.getFullYear() + "/" + month + "/" + day + "/" + hour;
  };

  /**
   * @summary create date element. (0 padding)
   *
   * @function createDateElement
   *
   * @param {String} value
   * date element
   *
   * @return {String} 0 padding date element
   */

  var createDateElement = function(value) {

    if (value.length === 1) {
      value = "0" + value;
    }

    return value;
  };

  /**
   * @summary Check whether the user permissions based on parameter effect of policy
   *
   * @function isEffect
   *
   * @param {boolean} evalute
   * value after check condition user's permission
   * @param {string} effect
   * var represents the right to influence or not(Permis or deny)
   *
   * @return {boolean} return evaluate if effect is permit. Return inverse evaluate if effect is deny
   */

  var isEffect = function (evalute, effect) {
    if (effect.toLowerCase() === "deny") {
      if (evalute === true) {
        evalute = false;
      } else {
        evalute = true;
      }
    }
    return evalute;
  };

  /**
   * @summary convert array from string contains comma character
   *
   * @function convertValues
   *
   * @param {string} values
   * String contains comma character
   *
   * @return {Array} array converted from string contains comma character
   */

  var convertValues = function (values) {
    
    let dumyValues = values.trim().split(",");

    let resultValue = [];

    for (let i = 0; i < dumyValues.length; i++) {
      let dumyValue = dumyValues[i];
      for (let j = 0; j < dumyValues.length; j++) {
        // if dumyValues's last character is "\" and next value exists, get rid of "\" from value and concatenate next Value
        if(dumyValues[j].endsWith("\\") && j !== dumyValues.length - 1 && dumyValues[j+1] !== "") {
          i++;
          dumyValue = dumyValues[j].substring(0, dumyValues[j].length - 1);
          dumyValue = dumyValue.concat(",", dumyValues[j+1]);
        }

        // if next value doesn't exist, get rid of "\" from value and concatenate ","
        if (dumyValue.endsWith("\\")) {
          i++;
          j++;
          dumyValue = dumyValue.concat(",");
        }
      }
      resultValue.push(dumyValue.trim());
    }

    return resultValue;
  };

  /**
   * @summary Compare two string based on parameter evalType
   *
   * @function evaluate
   *
   * @param {string} paramOne
   * param 1st to compare
   * @param {string} paramTwo
   * param 2nd to compare
   * @param {string} evalType
   * type of compare (strfull, strprefix...)
   *
   * @return {boolean} return True of two parameter mapping based on evalType. Otherwise return false
   */

  var evaluate = function (paramOne, paramTwo, evalType) {
    var checkEval = false;
    // compare two string with evalType is strfull
    if (evalType.trim().toLowerCase() === "strfull") {
      if (paramOne.trim() === paramTwo.trim()) {
        checkEval = true;
      } else {
        checkEval = false;
      }
      return checkEval;
    }
    // compare two string with evalType is strprefix
    if (evalType.trim().toLowerCase() === "strprefix") {
      checkEval = paramTwo.startsWith(paramOne);
      return checkEval;
    }
    // compare two string with evalType is strsuffix
    if (evalType.trim().toLowerCase() === "strsuffix") {
      checkEval = paramTwo.endsWith(paramOne);
      return checkEval;
    }
    // compare two string with evalType is strpart
    if (evalType.trim().toLowerCase() === "strpart") {
      checkEval = paramTwo.includes(paramOne);
      return checkEval;
    }
    // compare two string with evalType is notstrfull
    if (evalType.trim().toLowerCase() === "notstrfull") {
      if (paramOne.trim() === paramTwo.trim()) {
        checkEval = false;
      } else {
        checkEval = true;
      }
      return checkEval;
    }
    // compare two string with evalType is notstrprefix
    if (evalType.trim().toLowerCase() === "notstrprefix") {
      checkEval = !paramTwo.startsWith(paramOne);
      return checkEval;
    }
    // compare two string with evalType is notstrsuffix
    if (evalType.trim().toLowerCase() === "notstrsuffix") {
      checkEval = !paramTwo.endsWith(paramOne);
      return checkEval;
    }
    // compare two string with evalType is notstrpart
    if (evalType.trim().toLowerCase() === "notstrpart") {
      checkEval = !paramTwo.includes(paramOne);
      return checkEval;
    }
  };

  // HANLE POLICY DATA GET FROM SQLITE DATABASE.

  /**
   * @summary Get all policy data from database then add it to the PolicySet object.
   *
   * @function getAllPolicyFromDatabase
   *
   * @param {object} stvDAO
   * Instance of StvDAO
   * @param {function} callback
   * Callback policy data
   *
   */

  var getAllPolicyFromDatabase = function (stvDAO, callback) {
    var ListPolicy = {};
    var PolicySet = {};
    var Policy = [];
    stvDAO.transaction(function (trans) {
        trans.selectSQL("selectAllPolicy", [], function (tx, resultPolicy) {
            let policyLength = resultPolicy.rows.length;
            for (let i = 0; i < policyLength; i++) {
              let _policyId = resultPolicy.rows.item(i)["POLICY_ID"];
              let _effect = resultPolicy.rows.item(i)["EFFECT"];
              let _policy = {
                policyId: _policyId,
                effect: _effect,
                Rule: []
              };
              Policy.push(_policy);
            }
            PolicySet = {
              Policy: Policy
            };

            ListPolicy = {
              PolicySet: PolicySet
            };
            // Get all rule from database
            getAllRule(tx, policyLength, PolicySet);
          },
          null
        );
      },
      function errorCB() {
        debugLog.error("Error get all policy from database");
      },
      function successCB() {
        debugLog.info("Success get all policy from database");
        callback(ListPolicy);
      }
    );
  };

  /**
   * @summary Get all rule data from database then add it to the PolicySet object.
   *
   * @function getAllRule
   *
   * @param {object} trans
   * Sub transaction of selectSQL transaction after selecting successful all policy data from database
   * @param {number} policyLength
   * Length of policy data
   * @param {object} PolicySet
   * List of policy data
   *
   */

  var getAllRule = function (trans, policyLength, PolicySet) {
    trans.selectSQL("selectAllRule", [], function (tx, resultRule) {
      let ruleLength = resultRule.rows.length;
      for (let i = 0; i < policyLength; i++) {
        for (let j = 0; j < ruleLength; j++) {
          let _rule_policyId = resultRule.rows.item(j)["POLICY_ID"];
          if (PolicySet.Policy[i].policyId === _rule_policyId) {
            let _ruleId = resultRule.rows.item(j)["RULE_ID"];
            PolicySet.Policy[i].Rule.push({
              ruleId: _ruleId
            });
          }
        }
      }

      //Get all subject, resource, action, condition from database
      getAllSubject(tx, policyLength, PolicySet);
      getAllResource(tx, policyLength, PolicySet);
      getAllAction(tx, policyLength, PolicySet);
      getAllCondition(tx, policyLength, PolicySet);
    }, null);
  };

  /**
   * @summary Get all subject data from the database then add it to the PolicySet object.
   *
   * @function getAllSubject
   *
   * @param {object} trans
   * Sub transaction of selectSQL transaction after selecting successful all rule data from database
   * @param {number} policyLength
   * Length of policy data
   * @param {object} PolicySet
   * List of policy data
   *
   */

  var getAllSubject = function (trans, policyLength, PolicySet) {
    trans.selectSQL("selectAllSubject", [], function (tx, resultSubject) {
      let subjectLength = resultSubject.rows.length;
      for (let i = 0; i < policyLength; i++) {
        let _rule_policy_length = PolicySet.Policy[i].Rule.length;
        for (let j = 0; j < _rule_policy_length; j++) {
          for (let k = 0; k < subjectLength; k++) {
            let _subject_ruleId = resultSubject.rows.item(k)["RULE_ID"];
            if (PolicySet.Policy[i].Rule[j].ruleId === _subject_ruleId) {
              let _svalueType = resultSubject.rows.item(k)["VALUE_TYPE"];
              let _sevalType = resultSubject.rows.item(k)["EVAL_TYPE"];
              let _svalue = resultSubject.rows.item(k)["VALUE"];
              let _subject = {
                valueType: _svalueType,
                evalType: _sevalType,
                value: _svalue
              };
              if (PolicySet.Policy[i].Rule[j].Subject) {
                // If the subject table has multiple Subject with the same ruleId.
                // Subject will be pushed to an array
                if (!(PolicySet.Policy[i].Rule[j].Subject instanceof Array)) {
                  let tempSubject = PolicySet.Policy[i].Rule[j].Subject;
                  PolicySet.Policy[i].Rule[j].Subject = [];
                  PolicySet.Policy[i].Rule[j].Subject.push(tempSubject);
                }
                PolicySet.Policy[i].Rule[j].Subject.push(_subject);
              } else {
                PolicySet.Policy[i].Rule[j].Subject = _subject;
              }
            }
          }
        }
      }
    }, null);
  };

  /**
   * @summary Get all resource data from the database then add it to the PolicySet object.
   *
   * @function getAllResource
   *
   * @param {object} trans
   * Sub transaction of selectSQL transaction after selecting successful all rule data from database
   * @param {number} policyLength
   * Length of policy data
   * @param {object} PolicySet
   * List of policy data
   *
   */

  var getAllResource = function (trans, policyLength, PolicySet) {
    trans.selectSQL("selectAllResource", [], function (tx, resultResource) {
      let resourceLength = resultResource.rows.length;
      for (let i = 0; i < policyLength; i++) {
        let _rule_policy_length = PolicySet.Policy[i].Rule.length;
        for (let j = 0; j < _rule_policy_length; j++) {
          for (let k = 0; k < resourceLength; k++) {
            let _resource_ruleId = resultResource.rows.item(k)["RULE_ID"];
            if (PolicySet.Policy[i].Rule[j].ruleId === _resource_ruleId) {
              let _rvalueType = resultResource.rows.item(k)["VALUE_TYPE"];
              let _revalType = resultResource.rows.item(k)["EVAL_TYPE"];
              let _rvalue = resultResource.rows.item(k)["VALUE"];
              let _resource = {
                valueType: _rvalueType,
                evalType: _revalType,
                value: _rvalue
              };
              if (PolicySet.Policy[i].Rule[j].Resource) {
                // If the resource table has multiple Resource with the same ruleId.
                // Resource will be pushed to an array
                if (!(PolicySet.Policy[i].Rule[j].Resource instanceof Array)) {
                  let tempResource = PolicySet.Policy[i].Rule[j].Resource;
                  PolicySet.Policy[i].Rule[j].Resource = [];
                  PolicySet.Policy[i].Rule[j].Resource.push(tempResource);
                }
                PolicySet.Policy[i].Rule[j].Resource.push(_resource);
              } else {
                PolicySet.Policy[i].Rule[j].Resource = _resource;
              }
            }
          }
        }
      }
    }, null);
  };

  /**
   * @summary Get all action data from the database then add it to the PolicySet object.
   *
   * @function getAllAction
   *
   * @param {object} trans
   * Sub transaction of selectSQL transaction after selecting successful all rule data from database
   * @param {number} policyLength
   * Length of policy data
   * @param {object} PolicySet
   * List of policy data
   *
   */

  var getAllAction = function (trans, policyLength, PolicySet) {
    trans.selectSQL("selectAllAction", [], function (tx, resultAction) {
      let actionLength = resultAction.rows.length;
      for (let i = 0; i < policyLength; i++) {
        let _rule_policy_length = PolicySet.Policy[i].Rule.length;
        for (let j = 0; j < _rule_policy_length; j++) {
          for (let k = 0; k < actionLength; k++) {
            let _action_ruleId = resultAction.rows.item(k)["RULE_ID"];
            if (PolicySet.Policy[i].Rule[j].ruleId === _action_ruleId) {
              let _avalueType = resultAction.rows.item(k)["VALUE_TYPE"];
              let _aevalType = resultAction.rows.item(k)["EVAL_TYPE"];
              let _avalue = resultAction.rows.item(k)["VALUE"];
              let _action = {
                valueType: _avalueType,
                evalType: _aevalType,
                value: _avalue
              };
              if (PolicySet.Policy[i].Rule[j].Action) {
                // If the action table has multiple Action with the same ruleId.
                // Action will be pushed to an array
                if (!(PolicySet.Policy[i].Rule[j].Action instanceof Array)) {
                  let tempAction = PolicySet.Policy[i].Rule[j].Action;
                  PolicySet.Policy[i].Rule[j].Action = [];
                  PolicySet.Policy[i].Rule[j].Action.push(tempAction);
                }
                PolicySet.Policy[i].Rule[j].Action.push(_action);
              } else {
                PolicySet.Policy[i].Rule[j].Action = _action;
              }
            }
          }
        }
      }
    }, null);
  };

  /**
   * @summary Get all condition data from the database then add it to the PolicySet object.
   *
   * @function getAllCondition
   *
   * @param {object} trans
   * Sub transaction of selectSQL transaction after selecting successful all rule data from database
   * @param {number} policyLength
   * Length of policy data
   * @param {object} PolicySet
   * List of policy data
   *
   */

  var getAllCondition = function (trans, policyLength, PolicySet) {
    trans.selectSQL("selectAllCondition", [], function (tx, resultCondition) {
      let conditionLength = resultCondition.rows.length;
      for (let i = 0; i < policyLength; i++) {
        let _rule_policy_length = PolicySet.Policy[i].Rule.length;
        for (let j = 0; j < _rule_policy_length; j++) {
          for (let k = 0; k < conditionLength; k++) {
            let _condition_ruleId = resultCondition.rows.item(k)["RULE_ID"];
            if (PolicySet.Policy[i].Rule[j].ruleId === _condition_ruleId) {
              let _cvalueType = resultCondition.rows.item(k)["VALUE_TYPE"];
              let _cevalType = resultCondition.rows.item(k)["EVAL_TYPE"];
              let _cvalue = resultCondition.rows.item(k)["VALUE"];
              let _condition = {
                valueType: _cvalueType,
                evalType: _cevalType,
                value: _cvalue
              };
              if (PolicySet.Policy[i].Rule[j].Condition) {
                // If the condition table has multiple Condition with the same ruleId.
                // Condition will be pushed to an array
                if (!(PolicySet.Policy[i].Rule[j].Condition instanceof Array)) {
                  let tempCondition = PolicySet.Policy[i].Rule[j].Condition;
                  PolicySet.Policy[i].Rule[j].Condition = [];
                  PolicySet.Policy[i].Rule[j].Condition.push(tempCondition);
                }
                PolicySet.Policy[i].Rule[j].Condition.push(_condition);
              } else {
                PolicySet.Policy[i].Rule[j].Condition = _condition;
              }
            }
          }
        }
      }
    }, null);
  };

  /**
   * @summary Validate policy. Check parameters (effect, id and rule) of each policy valid or invalid. 
   *
   * @function validatePolicy
   *
   * @param {object} policyConfig
   * policy item
   * 
   * @return {boolean} validatePolicy is True if policyConfig validate successful. Otherwise, return false
   *
   */

  var validatePolicy = function (policyConfig) {
    if (policyConfig) {
      if (policyConfig["effect"].trim().toLowerCase() === "permit" || policyConfig["effect"].trim().toLowerCase() === "deny") {
        var ruleConfig = policyConfig["Rule"];
        if (!(ruleConfig instanceof Array)) {
          return validateRule(ruleConfig);
        } else {
          for (let i = 0; i < ruleConfig.length; i++) {
            if (!validateRule(ruleConfig[i])) {
              return false;
            }
          }
          return true;
        }
      } else {
        debugLog.error("error value of effect in Policy");
        return false;
      }
    } else {
      debugLog.error("not find policy");
      return false;
    }
  };

  /**
   * @summary Validate Rule
   *
   * @function validateRule
   *
   * @param {object} ruleConfig
   * Rule item
   * 
   * @return {boolean} validateRule
   *
   */

  var validateRule = function (ruleConfig) {

    if (ruleConfig) {
        if (!ruleConfig["Subject"] && !ruleConfig["Resource"] && !ruleConfig["Condition"] && !ruleConfig["Action"]) {
          debugLog.error("rule must have either subject, resource, action, or condition");
          return false;
        }

        if (ruleConfig["Subject"]) {
          if (!(ruleConfig["Subject"] instanceof Array)) {
            if (!validateSubject(ruleConfig["Subject"])) {
              return false;
            }
          } else {
            var subjectList = ruleConfig["Subject"];
            for (let i = 0; i < subjectList.length; i++) {
              if (!validateSubject(subjectList[i])) {
                return false;
              }
            }
          }
        }

        if (ruleConfig["Resource"]) {
          if (!(ruleConfig["Resource"] instanceof Array)) {
            if (!validateResource(ruleConfig["Resource"])) {
              return false;
            }
          } else {
            var resourcetList = ruleConfig["Resource"];
            for (let i = 0; i < resourcetList.length; i++) {
              if (!validateResource(resourcetList[i])) {
                return false;
              }
            }
          }
        }

        if (ruleConfig["Action"]) {
          if (!(ruleConfig["Action"] instanceof Array)) {
            if (!validateAction(ruleConfig["Action"])) {
              return false;
            }
          } else {
            var actionList = ruleConfig["Action"];
            for (let i = 0; i < actionList.length; i++) {
              if (!validateAction(actionList[i])) {
                return false;
              }
            }
          }
        }

        if (ruleConfig["Condition"]) {      
          if (!(ruleConfig["Condition"] instanceof Array)) {
            if (!validateCondition(ruleConfig["Condition"])) {
              return false;
            }
          } else {
            var conditionList = ruleConfig["Condition"];
            for (let i = 0; i < conditionList.length; i++) {
              if (!validateCondition(conditionList[i])) {
                return false;
              }
            }
          }
        }

        return true;
    } else {
      debugLog.error("not find rule");
      return false;
    }
  };

  /**
   * @summary Validate Subject. Check parameter valueType, evalType of subject valid or invalid
   *
   * @function validateSubject
   *
   * @param {object} subjectConfig
   * Subject item
   * 
   * @return {boolean} validateSubject is True if subjectConfig validate successful. Otherwise, return false
   *
   */

  var validateSubject = function (subjectConfig) {
      if (subjectConfig["valueType"]) {
        if (validateEvalType(subjectConfig["evalType"].trim().toLowerCase())) {
          return true;
        } else {
          debugLog.error("error evalType in Subject");
          return false;
        }
      } else {
        debugLog.error("error valueType of Subject");
        return false;
      }
  };

  /**
   * @summary Validate Resource. Check parameter valueType, evalType of resource valid or invalid
   *
   * @function validateResource
   *
   * @param {object} resourceConfig
   * Resource item
   * 
   * @return {boolean} validateResource is True if resourceConfig validate successful. Otherwise, return false
   *
   */

  var validateResource = function (resourceConfig) {
        if (validateEvalType(resourceConfig["evalType"].trim().toLowerCase())) {
          return true;
        } else {
          debugLog.error("error evalType in Resource");
          return false;
        }
  };

  /**
   * @summary Validate Action. Check parameter valueType, evalType of subject valid or invalid
   *
   * @function validateAction
   *
   * @param {object} actionConfig
   * Action item
   * 
   * @return {boolean} validateAction is True if actionConfig validate successful. Otherwise, return false
   *
   */

  var validateAction = function (actionConfig) {
    if (actionConfig["valueType"]) {
      if (validateEvalType(actionConfig["evalType"].trim().toLowerCase())) {
        return true;
      } else {
        debugLog.error("error evalType in Action");
        return false;
      }
    } else {
      debugLog.error("error valueType of Action");
      return false;
    }
  };

  /**
   * @summary Validate condition get from database. Check evalType, valueType and value of condition valid or invalid. If all of them valid return true, otherwise return false
   *
   * @function validateCondition
   *
   * @param {object} conditionConfig
   * Condition item
   * 
   * @return {boolean} validateCondition is True if conditionConfig validate successful. Otherwise, return false
   *
   */

  var validateCondition = function (conditionConfig) {
      if (conditionConfig["valueType"] === conditionConfig["evalType"]) {
        if (conditionConfig["valueType"].trim().toLowerCase() === "week") {
          let dayConfig = conditionConfig["value"].trim().split(",");
          return validateDay(dayConfig);
        } else if (conditionConfig["valueType"].trim().toLowerCase() === "term") {
          let dateConfig = conditionConfig["value"].trim().split("-");
          if (dateConfig.length != 2) {
            return false;
          }
          if (validateDate(dateConfig[0].trim()) == true && !dateConfig[0].includes("\*") && dateConfig[1].trim().length === 0) {
            return true;
          } else if (validateDate(dateConfig[1].trim()) == true && !dateConfig[1].includes("\*") && dateConfig[0].trim().length === 0) {
            return true;
          } else if (validateDate(dateConfig[0].trim()) == true && validateDate(dateConfig[1].trim()) == true && validateWildCardDate(dateConfig)) {
            return true;
          } else {
            debugLog.error("error value of evalType in Condition");
            return false;
          }
        } else {
          debugLog.error("evalType is not match");
          return false;
        }
      } else {
        debugLog.error("valueType is not equal evalType of Condition");
        return false;
      }
  };

  /**
   * @summary Validate EvalType of Subject and Resource. If evalType is one of {strfull,strprefix,strsuffix,strpart,notstrfull,notstrprefix,notstrsuffix,notstrpart}, return true. Otherwise return false.
   *
   * @function validateEvalType
   *
   * @param {string} evalType
   * value of evalType
   * 
   * @return {boolean} validateEvalType is True if evalType validate successful. Otherwise, return false
   *
   */

  var validateEvalType = function (evalType) {
    if (evalType === "strfull" || evalType === "strprefix" || evalType === "strsuffix" ||
      evalType === "strpart" || evalType === "notstrfull" || evalType === "notstrprefix" ||
      evalType === "notstrsuffix" || evalType === "notstrpart") {
      return true;
    } else {
      debugLog.error("error evalType not match");
      return false;
    }
  };

  return StvAuthorize;

})();


// INIT POLICY DATA
/**
 * Constructs a new StvAuthorizeInitPolicy object.<br>
 * @class
 * @classdesc This class is used to init policy data when starting application 
 *
 * @version Staveware Mobile for Hybrid Ver.4.1
 * @return a new StvAuthorizeInitPolicy instance
 */
var StvAuthorizeInitPolicy = (function () {

  /**
   * Constructor. This should not be used.
   * @constructor StvAuthorizeInitPolicy
   */
  var StvAuthorizeInitPolicy = function StvAuthorizeInitPolicy() {};

  /**
   * @init Log function
   */

  var debugLog = StvLogFactory.getLogger(StvLog.LOG_NAME);

  /**
   * @summary This API is used to initialize policy data when starting application
   *  
   * @function initializePolicyData
   * @static
   * @param {function} callback
   * callback function return boolean type which is result of get and validate policy from sqlite database
   *
   * @example
   * <pre>
   * Example:
   * StvAuthorizeInitPolicy.initializePolicyData(function(result){
   *  if(result === true){
   * //HANDLE SUCCESS EVENT
   *    console.log("Initialize and validate policy success");
   *  }else{
   * //HANLE FAIL EVENT
   *    console.log("Policy is invalid");
   *  }    
   * });
   * </pre>
   * 
   */

  StvAuthorizeInitPolicy.initializePolicyData = function (callback) {
    var checkFile = doesSettingFileExist("staveware/authorization/staveware-dbmap.xml", "staveware/authorization/staveware-sqlmap.xml");
    if (checkFile) {
      doesDatabaseExist(callback);
    } else {
      //RETURN INIT POLICY FAIL IF SETTING FILE IS NOT EXIST
      let result = false;
      callback(result);
      throw new IllegalArgumentException("Setting file is not exist");
    }
  };

  /**
   * @summary Check setting file include "DatabaseMap" file name and "SQLMap" file name is exist or not exist
   * 
   * @function doesSettingFileExist
   * 
   * @param {string} dbFileName
   * directory path of DatabaseMap file name
   * @param {string} sqlFileName
   * directory path of SQLMap file name
   * 
   * @return {boolean} return true if both DatabaseMap file name and SQLMap file name is exist. And return false if DatabaseMap file name or SQLMap file name is not exist
   * 
   */

  var doesSettingFileExist = function (dbFileName, sqlFileName) {
        if ((dbFileName !== "") && (dbFileName !== null) && (dbFileName != undefined) &&
            (sqlFileName !== "") && (sqlFileName !== null) && (sqlFileName != undefined)) {
            try {
                var xhttp = new XMLHttpRequest();
                xhttp.open("GET", dbFileName, false);
                xhttp.send(null);
            } catch (ex) {
                console.log(ex);
            }
            var xmlDB = xhttp.responseXML;
            if (xmlDB) {
                try {
                    xhttp.open("GET", sqlFileName, false);
                    xhttp.send(null);
                } catch (ex) {
                    console.log(ex);
                }
                var xmlSQL = xhttp.responseXML;
                if (xmlSQL) {
                    return true;
                }
                debugLog.error("SqlMap file name doesn't exist");
                return false;
            } else {
                debugLog.error("Database file name doesn't exist");
                return false;
            }
        } else {
            throw new IllegalArgumentException("dbFileName or sqlFileName must not null or empty or undefined");
        }
    };

  /**
   * @summary Check database AuthorizationDB is exist or not exist
   * <ul style = "list-style: none;">
   * <li> • Read revision number from "staveware-config.xml" file
   * <li> • This function uses the "cordova-plugin-file" plugin to test whether AuthorizationDB exists or not 
     and use the "cordova-plugin-device" plugin to check which device is used.
   * <li> • In the case AuthorizationDB is existed, callback function databaseIsExist() is executed.
   * <li> • In the case AuthorizationDB is not existed, callback function databaseIsNotExist() is executed.
   * </ul>
   * 
   * @function doesDatabaseExist 
   * 
   * @param {function} callback
   * callback function
   */

  var doesDatabaseExist = function (callback) {
    try {
      var fileRevision = readRevisionConfig("staveware/staveware-config.xml");
    } catch (err) {
      debugLog.error(err);
      //RETURN INIT POLICY FAIL IF READ REVISION CONFIG FROM .XML FILE IS ERROR
      let result = false;
      return callback(result);
    }
    let databasePath = cordova.file.applicationStorageDirectory + "/databases/AuthorizationDB";
    if (device !== null && device.platform === "iOS") {
      databasePath = cordova.file.applicationStorageDirectory + "/Library/LocalDatabase/AuthorizationDB";
    }
    window.resolveLocalFileSystemURL(databasePath, function () {
      databaseIsExist(fileRevision, callback);
    }, function () {
      databaseIsNotExist(fileRevision, callback);
    });
  };

  // DATABASE IS EXIST
  /**
   * @summary Handle the case of AuthorizationDB database is existed.
   * 
   * <ul style = "list-style: none;">
   * <li> • Get revision number from IDMF_REVISION   
   * <li> • If revision data is exist and fileRevision > databaseRevision, dropping all table except IDMF_REVISION
         then create table again. After that all policy data is bulk inserted and revision number from "staveware-config.xml" is updated to SQLite database.
   * <li> • If revision data is not exist, dropping all table except IDMF_REVISION then create table again.
         After that all policy data is bulk inserted and revision number from "staveware-config.xml" is inserted to SQLite database.
   * </ul>
   * 
   * @function databaseIsExist
   * 
   * @param {number} fileRevision
   * revision number get from "staveware-config.xml" file
   * @param {function} callback
   * callback function
   * 
   */
  var databaseIsExist = function (fileRevision, callback) {
    var stvDAO = new StvDAO("staveware/authorization/staveware-dbmap", "staveware/authorization/staveware-sqlmap");
    stvDAO.openDatabase("AuthorizationDB");
    stvDAO.transaction(function (trans) {
      trans.selectSQL("selectRevision", [], function (tx, rs) {
        let revisionLength = rs.rows.length;
        if (revisionLength > 0) {
          let databaseRevision = rs.rows.item(0)["REVISION"];
          if (fileRevision > databaseRevision) {
            // DROP ALL TABLE EXCEPTION REVISION TABLE
            dropPolicyTable(tx);
            // CREATE ALL TABLE 
            createPolicyTable(tx);
            // BULK INSERT POLICY DATA    
            bulkInsertPolicy(stvDAO, function (stvDAO) {
              // UPDATE REVISION
              updateRevision(stvDAO, fileRevision, callback);
            }, function (result) {
              //RETURN INIT POLICY FAIL IF BULK INSERT POLICY ERROR
              callback(result);
            });
          } else if (fileRevision == databaseRevision) {
            StvAuthorize.getPolicyWithValidate(stvDAO, callback);
          } else {
            debugLog.info("File revision is less than database revision");
            //RETURN INIT POLICY FAIL IF FILE REVISION < DATABASE REVISION
            let result = false;
            callback(result);
          }
        } else {
          // DROP ALL TABLE EXCEPTION REVISION TABLE
          dropPolicyTable(tx);
          // CREATE ALL TABLE 
          createPolicyTable(tx);
          // BULK INSERT POLICY DATA
          bulkInsertPolicy(stvDAO, function (stvDAO) {
            // INSERT REVISION
            insertRevision(stvDAO, fileRevision, callback);
          }, function (result) {
            //RETURN INIT POLICY FAIL IF BULK INSERT POLICY ERROR
            callback(result);
          });
        }
      }, null);
    }, function errorCB() {
      debugLog.error("Transaction get revision is fail");
    }, function successCB() {
      debugLog.info("Transaction get revision is success");
    });
  };

  // DATABASE IS NOT EXIST
  /**
   * @summary Handle the case of AuthorizationDB database is not exist.
   * 
   * <ul style = "list-style: none;">
   * <li> • Create AuthorizationDB include both all policy tables and revision table
   * <li> • Execute bulk insert all policy data to SQLite database then revision number is inserted to SQLite database
            when execute bulk insert is successful
   * </ul> 
   * @function databaseIsNotExist
   
   * @param {number} fileRevision
   * revision number get from "staveware-config.xml" file
   * @param {function} callback
   * callback function
   * 
   */
  var databaseIsNotExist = function (fileRevision, callback) {
    var stvDAO = new StvDAO("staveware/authorization/staveware-dbmap", "staveware/authorization/staveware-sqlmap");
    stvDAO.openDatabase("AuthorizationDB");
    stvDAO.transaction(function (trans) {
      trans.sql("createTablePolicy", [], null, null);
      trans.sql("createTableRule", [], null, null);
      trans.sql("createTableSubject", [], null, null);
      trans.sql("createTableResource", [], null, null);
      trans.sql("createTableAction", [], null, null);
      trans.sql("createTableCondition", [], null, null);
      trans.sql("createTableRevision", [], null, null);
    });
    //BULK INSERT POLICY DATA
    bulkInsertPolicy(stvDAO, function (stvDAO) {
      // INSERT REVISION
      insertRevision(stvDAO, fileRevision, callback);
    }, function (result) {
      //RETURN INIT POLICY FAIL IF BULK INSERT POLICY ERROR
      callback(result);
    });
  };

  /**
   * @summary Read revision number from "staveware-config.xml" file
   * 
   * @function readRevisionConfig
   * 
   * @param {string} filePath
   * directory path of config file
   * 
   * @return {number} policy revision
   */

  var readRevisionConfig = function (filePath) {
    if ((filePath !== "") && (filePath !== null) && (filePath != undefined)) {
      var xhttp = new XMLHttpRequest();
      xhttp.open("GET", filePath, false);
      xhttp.send(null);
      var xmlDoc = xhttp.responseXML;
      if (xmlDoc) {
        var elems = xmlDoc.getElementsByTagName("policyData");
        var elem = elems[0];
        var revision = elem.getAttribute("revision");
        let policyRevision = Number(revision);
        if (isNaN(policyRevision)) {
          throw new IllegalArgumentException("Policy revision must be number");
        }
        if (policyRevision < 0) {
          throw new IllegalArgumentException("Policy revision can not less than zero");
        }
        return policyRevision;
      } else {
        throw new IllegalArgumentException(filePath + " is not found.");
      }
    } else {
      throw new IllegalArgumentException("filePath must not null or empty or undefined");
    }
  };

  /**
   * @summary Drop all policy tables except IDMF_REVISION TABLE
   * 
   * @function dropPolicyTable
   * 
   * @param {object} trans
   * sqlite transactions
   * 
   */

  var dropPolicyTable = function (trans) {
    trans.sql("dropTablePolicy", [], null, null);
    trans.sql("dropTableRule", [], null, null);
    trans.sql("dropTableSubject", [], null, null);
    trans.sql("dropTableResource", [], null, null);
    trans.sql("dropTableAction", [], null, null);
    trans.sql("dropTableCondition", [], null, null);
  };

  /**
   * @summary Create all policy table except IDMF_REVISION TABLE
   * @function createPolicyTable
   * 
   * @param {object} trans
   * sqlite transactions
   */
  var createPolicyTable = function (trans) {
    trans.sql("createTablePolicy", [], null, null);
    trans.sql("createTableRule", [], null, null);
    trans.sql("createTableSubject", [], null, null);
    trans.sql("createTableResource", [], null, null);
    trans.sql("createTableAction", [], null, null);
    trans.sql("createTableCondition", [], null, null);
  };

  /**
   * @summary Insert revision to sqlite database
   * <ul style = "list-style: none;">
   * <li> • Insert file revision to sqlite database
   * <li> • If insert revision to sqlite database is error, return init policy fail
   * <li> • After execute insert revision to sqlite database success, get all policy from database with validation
   * </ul> 
   * @function insertRevision
   * 
   * @param {object} stvDAO
   * Instance of StvDAO
   * 
   * @param {number} fileRevision
   * Revision of policy get from config file
   * 
   * @param {function} callback
   * Callback function
   * 
   */

  var insertRevision = function (stvDAO, fileRevision, callback) {
    stvDAO.transaction(function (trans) {
      trans.insertSQL("insertRevision", [fileRevision], null, null);
    }, function errorCB() {
      debugLog.error("Transaction insert revision is fail");
      // RETURN INIT POLICY FAIL IF INSERT REVISION TO SQLITE DATABASE ERROR
      let result = false;
      callback(result);
    }, function successCB() {
      debugLog.info("Transaction insert revision is success");
      // GET ALL POLICY FROM DATABASE WITH VALIDATION
      StvAuthorize.getPolicyWithValidate(stvDAO, callback);
    });
  };

  /**
   * @summary Update revision to sqlite database
   * <ul style = "list-style: none;">
   * <li> • Update file revision to sqlite database
   * <li> • If update revision to sqlite database is error, return init policy fail
   * <li> • After execute update revision to sqlite database success, get all policy from database with validation
   * </ul> 
   * @function updateRevision
   * 
   * @param {object} stvDAO
   * Instance of StvDAO
   *  
   * @param {number} fileRevision
   * Revision of policy get from config file
   * 
   * @param {function} callback
   * Callback function
   */
  var updateRevision = function (stvDAO, fileRevision, callback) {
    stvDAO.transaction(function (trans) {
      trans.updateSQL("updateRevision", [fileRevision], null, null);
    }, function errorCB() {
      debugLog.error("Transaction update revision is fail");
      // RETURN INIT POLICY FAIL IF INSERT REVISION TO SQLITE DATABASE ERROR
      let result = false;
      callback(result);
    }, function successCB() {
      debugLog.info("Transaction update revision is success");
      StvAuthorize.getPolicyWithValidate(stvDAO, callback);
    });
  };


  /**
   * @summary Insert all policy data to sqlite database
   * 
   * @function bulkInsertPolicy
   * 
   * @param {object} stvDAO
   * Instance of StvDAO
   * 
   * @param {function} successCallback
   * Success callback function
   * 
   * @param {function} errorCallback
   * Error callback function
   */
  var bulkInsertPolicy = function (stvDAO, successCallback, errorCallback) {
    try {
        stvDAO.transaction(function (trans) {
          var isExistRuleElement = false;

            if (StvCommon.isFileExist("insertData/policy.json")) {
              trans.bulkInsertSQL("insertPolicy", [], null, null, null);
            } else {
              throw new IllegalArgumentException("Policy file is not exist");
            }

            if (StvCommon.isFileExist("insertData/rule.json")) {
              trans.bulkInsertSQL("insertRule", [], null, null, null);
            } else {
              throw new IllegalArgumentException("Rule file is not exist");
            }

            if (StvCommon.isFileExist("insertData/subject.json")) {
              trans.bulkInsertSQL("insertSubject", [], null, null, null);
              isExistRuleElement = true;
            }

            if (StvCommon.isFileExist("insertData/resource.json")) {
              trans.bulkInsertSQL("insertResource", [], null, null, null);
              isExistRuleElement = true;
            }

            if (StvCommon.isFileExist("insertData/action.json")) {
              trans.bulkInsertSQL("insertAction", [], null, null, null);
              isExistRuleElement = true;
            }

            if (StvCommon.isFileExist("insertData/condition.json")) {
              trans.bulkInsertSQL("insertCondition", [], null, null, null);
              isExistRuleElement = true;
            }

            if (isExistRuleElement === false) {
              throw new IllegalArgumentException("Subject or resource or action or condtion file is not exist");
            }
        
        },
        function errorCB() {
          debugLog.error("Transaction bulk insert policy fail");
          // RETURN INIT POLICY FAIL IF BULK INSERT POLICY TO SQLITE DATABASE ERROR
          let result = false;
          errorCallback(result);
        },
        function successCB() {
          debugLog.info("Transaction bulk insert policy success");
          successCallback(stvDAO);
        });
    } catch (ex) {
      debugLog.error("Transaction bulk insert policy fail");
      let result = false;
      errorCallback(result);
    }
  };

  return StvAuthorizeInitPolicy;
})();