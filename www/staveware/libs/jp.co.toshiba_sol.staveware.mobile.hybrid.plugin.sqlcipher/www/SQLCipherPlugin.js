/**
 * @(#)SQLCipherPlugin.js
 * (C)Copyright 2018 Toshiba Digital Solutions Corporation
 *
 * SQLCipherPlugin cordova plugin.
 */


cordova.define("jp.co.toshiba_sol.staveware.mobile.hybrid.plugin.sqlcipher.SQLCipherPlugin", function (require, exports, module) {
  (function () {
    var DB_STATE_INIT, DB_STATE_OPEN, READ_ONLY_REGEX, SQLiteFactory, SQLitePlugin, SQLitePluginTransaction, argsArray, dblocations, newSQLError, nextTick, root, txLocks;

    /**
     * root window object:
     */
    root = this;

    /**
     * constant(s)
     */
    READ_ONLY_REGEX = /^\s*(?:drop|delete|insert|update|create)\s/i;

    /**
     * per-db state
     */
    DB_STATE_INIT = "INIT";

    DB_STATE_OPEN = "OPEN";

    txLocks = {};

    /**
     * This is utility function for generate error message
     * @function newSQLError
     *
     * @param {string} error
     * The error message
     * @param {number} code
     * The code of error
     *
     * @return {Error} sqlError with a code and message
     */
    newSQLError = function (error, code) {
      var sqlError;
      sqlError = error;
      if (!code) {
        code = 0;
      }
      if (!sqlError) {
        sqlError = new Error("a plugin had an error but provided no response");
        sqlError.code = code;
      }
      if (typeof sqlError === "string") {
        sqlError = new Error(error);
        sqlError.code = code;
      }
      if (!sqlError.code && sqlError.message) {
        sqlError.code = code;
      }
      if (!sqlError.code && !sqlError.message) {
        sqlError = new Error("an unknown error was returned: " + JSON.stringify(sqlError));
        sqlError.code = code;
      }
      return sqlError;
    };

    nextTick = window.setImmediate || function (fun) {
      window.setTimeout(fun, 0);
    };


    /**
    * Utility that avoids leaking the arguments object. See
          https://www.npmjs.org/package/argsarray
    * @function argsArray
    *
    * @param {function} fun
    *
    * @return {function}
    */
    argsArray = function (fun) {
      return function () {
        var args, i, len;
        len = arguments.length;
        if (len) {
          args = [];
          i = -1;
          while (++i < len) {
            args[i] = arguments[i];
          }
          return fun.call(this, args);
        } else {
          return fun.call(this, []);
        }
      };
    };

    /**
     * SQLite plugin db-connection handle
     */

    /**
     * Constructor function of SQLite plugin
     * @function SQLitePlugin
     *
     * @param {object} openargs
     * Information used to open the database
     * @param {function} openSuccess
     * Callback function when handle event success
     * @param {function} openError
     * Callback function when handle event fail
     */
    SQLitePlugin = function (openargs, openSuccess, openError) {
      var dbname, passwordLength;
      if (!(openargs && openargs['name'])) {
        throw newSQLError("Cannot create a SQLitePlugin db instance without a db name");
      }
      dbname = openargs.name;
      passwordLength = openargs.passwordLength;
      if (typeof dbname !== 'string') {
        throw newSQLError('sqlite plugin database name must be a string');
      }

      if (!Number.isInteger(passwordLength)) {
        throw newSQLError('sqlite plugin password length must be a integer');
      }

      this.openargs = openargs;
      this.dbname = dbname;
      this.passwordLength = passwordLength;
      this.openSuccess = openSuccess;
      this.openError = openError;
      this.openSuccess || (this.openSuccess = function () {
        console.log("DB opened: " + dbname);
      });
      if (typeof this.openError !== 'function') {
        this.openError = function (e) {
          console.log(e.message);
        };
      }
      this.open(this.openSuccess, this.openError);
    };

    /**
    * Database features
    * @function databaseFeatures
    */
    SQLitePlugin.prototype.databaseFeatures = {
      isSQLitePluginDatabase: true
    };

    /**
     * Keep track of state of open db connections
     * @function openDBs
     */
    SQLitePlugin.prototype.openDBs = {};

    /**
     * This is a prototype function of SQLitePlugin used to add transaction
     * @function addTransaction
     *
     * @param {function} t
     * This is a SQLitePluginTransaction
     */
    SQLitePlugin.prototype.addTransaction = function (t) {
      if (!txLocks[this.dbname]) {
        txLocks[this.dbname] = {
          queue: [],
          inProgress: false
        };
      }
      txLocks[this.dbname].queue.push(t);
      if (this.dbname in this.openDBs && this.openDBs[this.dbname] !== DB_STATE_INIT) {
        this.startNextTransaction();
      } else {
        if (this.dbname in this.openDBs) {
          console.log('new transaction is waiting for open operation');
        } else {
          console.log('database is closed, new transaction is [stuck] waiting until db is opened again!');
        }
      }
    };

    /**
     * This is a prototype function of SQLitePlugin, it is a transaction function
     * @function transaction
     *
     * @param {function} fn
     * transaction function
     * @param {function} error
     * Error callback function
     * @param {function} success
     * Success callback function
     */
    SQLitePlugin.prototype.transaction = function (fn, error, success) {
      if (!this.openDBs[this.dbname]) {
        error(newSQLError('database not open'));
        return;
      }
      this.addTransaction(new SQLitePluginTransaction(this, fn, error, success, true, false));
    };

    /**
     * This is a prototype function of SQLitePlugin used to read transaction
     * @function readTransaction
     *
     * @param {function} fn
     * transaction function
     * @param {function} error
     * Error callback function
     * @param {function} success
     * Success callback function
     */
    SQLitePlugin.prototype.readTransaction = function (fn, error, success) {
      if (!this.openDBs[this.dbname]) {
        error(newSQLError('database not open'));
        return;
      }
      this.addTransaction(new SQLitePluginTransaction(this, fn, error, success, false, true));
    };

    /**
     * This is a prototype function of SQLitePlugin used to do next transaction
     * @function startNextTransaction
     */
    SQLitePlugin.prototype.startNextTransaction = function () {
      var self;
      self = this;
      nextTick((function (_this) {
        return function () {
          var txLock;
          if (!(_this.dbname in _this.openDBs) || _this.openDBs[_this.dbname] !== DB_STATE_OPEN) {
            console.log('cannot start next transaction: database not open');
            return;
          }
          txLock = txLocks[self.dbname];
          if (!txLock) {
            console.log('cannot start next transaction: database connection is lost');
            return;
          } else if (txLock.queue.length > 0 && !txLock.inProgress) {
            txLock.inProgress = true;
            txLock.queue.shift().start();
          }
        };
      })(this));
    };

    /**
     * This is a prototype function of SQLitePlugin used to abort all pending transaction
     * @function abortAllPendingTransactions
     */
    SQLitePlugin.prototype.abortAllPendingTransactions = function () {
      var j, len1, ref, tx, txLock;
      txLock = txLocks[this.dbname];
      if (!!txLock && txLock.queue.length > 0) {
        ref = txLock.queue;
        for (j = 0, len1 = ref.length; j < len1; j++) {
          tx = ref[j];
          tx.abortFromQ(newSQLError('Invalid database handle'));
        }
        txLock.queue = [];
        txLock.inProgress = false;
      }
    };

    /**
     * This is a prototype function of SQLitePlugin used to call the function "open" from the native API
     * @function open
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePlugin.prototype.open = function (success, error) {
      var openerrorcb, opensuccesscb;
      if (this.dbname in this.openDBs) {
        console.log('database already open: ' + this.dbname);
        nextTick((function (_this) {
          return function () {
            success(_this);
          };
        })(this));
      } else {
        console.log('OPEN database: ' + this.dbname);
        opensuccesscb = (function (_this) {
          return function () {
            var txLock;
            if (!_this.openDBs[_this.dbname]) {
              console.log('database was closed during open operation');
            }
            if (_this.dbname in _this.openDBs) {
              _this.openDBs[_this.dbname] = DB_STATE_OPEN;
            }
            if (!!success) {
              success(_this);
            }
            txLock = txLocks[_this.dbname];
            if (!!txLock && txLock.queue.length > 0 && !txLock.inProgress) {
              _this.startNextTransaction();
            }
          };
        })(this);
        openerrorcb = (function (_this) {
          return function () {
            console.log('OPEN database: ' + _this.dbname + ' failed, aborting any pending transactions');
            if (!!error) {
              error(newSQLError('Could not open database'));
            }
            delete _this.openDBs[_this.dbname];
            _this.abortAllPendingTransactions();
          };
        })(this);
        this.openDBs[this.dbname] = DB_STATE_INIT;
        cordova.exec(opensuccesscb, openerrorcb, "StvSQLCipherPlugin", "open", [this.openargs]);
      }
    };

    /**
     * This is a prototype function of SQLitePlugin used to call the function "close" from the native API
     * @function close
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePlugin.prototype.close = function (success, error) {
      if (this.dbname in this.openDBs) {
        if (txLocks[this.dbname] && txLocks[this.dbname].inProgress) {
          console.log('cannot close: transaction is in progress');
          error(newSQLError('database cannot be closed while a transaction is in progress'));
          return;
        }
        console.log('CLOSE database: ' + this.dbname);
        delete this.openDBs[this.dbname];
        if (txLocks[this.dbname]) {
          console.log('closing db with transaction queue length: ' + txLocks[this.dbname].queue.length);
        } else {
          console.log('closing db with no transaction lock state');
        }
        cordova.exec(success, error, "StvSQLCipherPlugin", "close", [{
          path: this.dbname
        }]);
      } else {
        console.log('cannot close: database is not open');
        if (error) {
          nextTick(function () {
            return error();
          });
        }
      }
    };

    /**
     * This is a prototype function of SQLitePlugin used to execute SQL
     * @function executeSql
     * @param {string} statement
     * The SQL query statement
     * @param {array} params
     * The values used for the SQL query statement
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePlugin.prototype.executeSql = function (statement, params, success, error) {
      var myerror, myfn, mysuccess;
      mysuccess = function (t, r) {
        if (!!success) {
          return success(r);
        }
      };
      myerror = function (t, e) {
        if (!!error) {
          return error(e);
        }
      };
      myfn = function (tx) {
        tx.addStatement(statement, params, mysuccess, myerror);
      };
      this.addTransaction(new SQLitePluginTransaction(this, myfn, null, null, false, false));
    };

    /**
     * This is a prototype function of SQLitePlugin
     * @function sqlBatch
     * @param {array} sqlStatements
     * List of sql query statements
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePlugin.prototype.sqlBatch = function (sqlStatements, success, error) {
      var batchList, j, len1, myfn, st;
      if (!sqlStatements || sqlStatements.constructor !== Array) {
        throw newSQLError('sqlBatch expects an array');
      }

      batchList = [];
      for (j = 0, len1 = sqlStatements.length; j < len1; j++) {
        st = sqlStatements[j];
        if (st.constructor === Array) {
          if (st.length === 0) {
            throw newSQLError('sqlBatch array element of zero (0) length');
          }
          batchList.push({
            sql: st[0],
            params: st.length === 0 ? [] : st[1]
          });
        } else {
          batchList.push({
            sql: st,
            params: []
          });
        }
      }
      myfn = function (tx) {
        var elem, k, len2, results;
        results = [];
        for (k = 0, len2 = batchList.length; k < len2; k++) {
          elem = batchList[k];
          results.push(tx.addStatement(elem.sql, elem.params, null, null));
        }
        return results;
      };
      this.addTransaction(new SQLitePluginTransaction(this, myfn, error, success, true, false));
    };

    /**
     * This method adds the SQL statement to the transaction queue.
     * @function SQLitePluginTransaction
     * @param {object} db
     * Reference the current instance of the method on which it is used.
     * @param {function} fn
     * transaction function
     * @param {function} error
     * Error callback function
     * @param {function} success
     * Success callback function
     * @param {bool} txlock
     * This attribute is used to set lock mode for transaction
     * @param {bool} readOnly
     * This attribute is used to set read only mode for transaction
     */
    SQLitePluginTransaction = function (db, fn, error, success, txlock, readOnly) {
      if (typeof fn !== "function") {

        /*
        This is consistent with the implementation in Chrome -- it
        throws if you pass anything other than a function. This also
        prevents us from stalling our txQueue if somebody passes a
        false value for fn.
         */
        throw newSQLError("transaction expected a function");
      }
      this.db = db;
      this.fn = fn;
      this.error = error;
      this.success = success;
      this.txlock = txlock;
      this.readOnly = readOnly;
      this.executes = [];
      if (txlock) {
        this.addStatement("BEGIN", [], null, function (tx, err) {
          throw newSQLError("unable to begin transaction: " + err.message, err.code);
        });
      } else {
        this.addStatement("SELECT 1", [], null, null);
      }
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function start
     */
    SQLitePluginTransaction.prototype.start = function () {
      var err;
      try {
        this.fn(this);
        this.run();
      } catch (error1) {
        err = error1;
        txLocks[this.db.dbname].inProgress = false;
        this.db.startNextTransaction();
        if (this.error) {
          this.error(newSQLError(err));
        }
      }
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function executeSql
     * @param {string} sql
     * The SQL query statement
     * @param {array} values
     * The values used for the SQL query statement
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePluginTransaction.prototype.executeSql = function (sql, values, success, error) {
      if (this.finalized) {
        throw {
          message: 'InvalidStateError: DOM Exception 11: This transaction is already finalized. Transactions are committed after its success or failure handlers are called. If you are using a Promise to handle callbacks, be aware that implementations following the A+ standard adhere to run-to-completion semantics and so Promise resolution occurs on a subsequent tick and therefore after the transaction commits.',
          code: 11
        };
        //return;
      }
      if (this.readOnly && READ_ONLY_REGEX.test(sql)) {
        this.handleStatementFailure(error, {
          message: 'invalid sql for a read-only transaction'
        });
        return;
      }
      this.addStatement(sql, values, success, error);
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function addStatement
     * @param {string} sql
     * The SQL query statement
     * @param {array} values
     * The values used for the SQL query statement
     * @param {function} success
     * Success callback function
     * @param {function} error
     * Error callback function
     */
    SQLitePluginTransaction.prototype.addStatement = function (sql, values, success, error) {
      var j, len1, params, t, v;
      params = [];
      if (!!values && values.constructor === Array) {
        for (j = 0, len1 = values.length; j < len1; j++) {
          v = values[j];
          t = typeof v;
          params.push((v === null || v === void 0 || t === 'number' || t === 'string' ? v : v instanceof Blob ? v.valueOf() : v.toString()));
        }
      }

      this.executes.push({
        success: success,
        error: error,
        sql: sql,
        params: params
      });
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function handleStatementSuccess
     * @param {function} handler
     * Success handler function
     * @param {object} response
     * Response message when handle statement
     */
    SQLitePluginTransaction.prototype.handleStatementSuccess = function (handler, response) {
      var payload, rows;
      if (!handler) {
        return;
      }
      rows = response.rows || [];
      payload = {
        rows: {
          item: function (i) {
            return rows[i];
          },
          length: rows.length
        },
        rowsAffected: response.rowsAffected || 0,
        insertId: response.insertId || void 0
      };
      handler(this, payload);
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function handleStatementFailure
     * @param {function} handler
     * Error handle function
     * @param {object} response
     * Response message when handle statement
     */
    SQLitePluginTransaction.prototype.handleStatementFailure = function (handler, response) {
      if (!handler) {
        throw newSQLError("a statement with no error handler failed: " + response.message, response.code);
      }
      if (handler(this, response) !== false) {
        throw newSQLError("a statement error callback did not return false: " + response.message, response.code);
      }
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function run
     */
    SQLitePluginTransaction.prototype.run = function () {
      var batchExecutes, handlerFor, i, mycb, mycbmap, request, tropts, tx, txFailure, waiting;
      txFailure = null;
      tropts = [];
      batchExecutes = this.executes;
      waiting = batchExecutes.length;
      this.executes = [];
      tx = this;
      handlerFor = function (index, didSucceed) {
        return function (response) {
          var err, error1;
          try {
            if (didSucceed) {
              tx.handleStatementSuccess(batchExecutes[index].success, response);
            } else {
              tx.handleStatementFailure(batchExecutes[index].error, newSQLError(response));
            }
          } catch (error1) {
            err = error1;
            if (!txFailure) {
              txFailure = newSQLError(err);
            }
          }
          if (--waiting === 0) {
            if (txFailure) {
              tx.abort(txFailure);
            } else if (tx.executes.length > 0) {
              tx.run();
            } else {
              tx.finish();
            }
          }
        };
      };
      i = 0;
      mycbmap = {};
      while (i < batchExecutes.length) {
        request = batchExecutes[i];
        mycbmap[i] = {
          success: handlerFor(i, true),
          error: handlerFor(i, false)
        };
        tropts.push({
          qid: 1111,
          sql: request.sql,
          params: request.params
        });
        i++;
      }
      mycb = function (result) {
        var j, last, q, r, ref, res, type;
        last = result.length - 1;
        for (i = j = 0, ref = last; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
          r = result[i];
          type = r.type;
          res = r.result;
          q = mycbmap[i];
          if (q) {
            if (q[type]) {
              q[type](res);
            }
          }
        }
      };

      cordova.exec(mycb, null, "StvSQLCipherPlugin", "backgroundExecuteSqlBatch", [{
        dbargs: {
          dbname: this.db.dbname
        },
        executes: tropts
      }]);
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function abort
     * @param {Error} txFailure
     * The error message when abort transaction
     */
    SQLitePluginTransaction.prototype.abort = function (txFailure) {
      var failed, succeeded, tx;
      if (this.finalized) {
        return;
      }
      tx = this;
      succeeded = function (tx) {
        txLocks[tx.db.dbname].inProgress = false;
        tx.db.startNextTransaction();
        if (tx.error) {
          tx.error(txFailure);
        }
      };
      failed = function (tx, err) {
        txLocks[tx.db.dbname].inProgress = false;
        tx.db.startNextTransaction();
        if (tx.error) {
          tx.error(newSQLError("error while trying to roll back: " + err.message, err.code));
        }
      };
      this.finalized = true;
      if (this.txlock) {
        this.addStatement("ROLLBACK", [], succeeded, failed);
        this.run();
      } else {
        succeeded(tx);
      }
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function finish
     */
    SQLitePluginTransaction.prototype.finish = function () {
      var failed, succeeded, tx;
      if (this.finalized) {
        return;
      }
      tx = this;
      succeeded = function (tx) {
        txLocks[tx.db.dbname].inProgress = false;
        tx.db.startNextTransaction();
        if (tx.success) {
          tx.success();
        }
      };
      failed = function (tx, err) {
        txLocks[tx.db.dbname].inProgress = false;
        tx.db.startNextTransaction();
        if (tx.error) {
          tx.error(newSQLError("error while trying to commit: " + err.message, err.code));
        }
      };
      this.finalized = true;
      if (this.txlock) {
        this.addStatement("COMMIT", [], succeeded, failed);
        this.run();
      } else {
        succeeded(tx);
      }
    };

    /**
     * This is a prototype function of SQLitePluginTransaction
     * @function abortFromQ
     * @param {Error} sqlerror
     * Error message
     */
    SQLitePluginTransaction.prototype.abortFromQ = function (sqlerror) {
      if (this.error) {
        this.error(sqlerror);
      }
    };

    dblocations = ["docs", "libs", "nosync"];


    /**
     * SQLite plugin object factory
     */
    SQLiteFactory = {

      /*
      NOTE: this function should NOT be translated from Javascript
      back to CoffeeScript by js2coffee.
      If this function is edited in Javascript then someone will
      have to translate it back to CoffeeScript by hand.
       */
      /**
       * Open a database. This API will be export out
       * @function opendb
       * @static
       * @param {array} args
       * values read from staveware-dbmap.xml
       */
      opendb: argsArray(function (args) {
        var dblocation, errorcb, first, fifth, okcb, openargs;
        if (args.length < 1) {
          return null;
        }
        first = args[0];
        if(args[4] === null){
            fifth = 64;
        }else{
            fifth = Number(args[4]);
        }
        openargs = null;
        okcb = null;
        errorcb = null;
        if (first.constructor === String) {
          openargs = {
            name: first,
            passwordLength: fifth
          };
          if (args.length >= 6) {
            okcb = args[5];
            if (args.length > 6) {
              errorcb = args[6];
            }
          }
        } else {
          openargs = first;
          if (args.length >= 2) {
            okcb = args[1];
            if (args.length > 2) {
              errorcb = args[2];
            }
          }
        }
        dblocation = !!openargs.location ? dblocations[openargs.location] : null;
        openargs.dblocation = dblocation || dblocations[0];
        if (!!openargs.createFromLocation && openargs.createFromLocation === 1) {
          openargs.createFromResource = "1";
        }
        if (!!openargs.androidDatabaseImplementation && openargs.androidDatabaseImplementation === 2) {
          openargs.androidOldDatabaseImplementation = 1;
        }
        if (!!openargs.androidLockWorkaround && openargs.androidLockWorkaround === 1) {
          openargs.androidBugWorkaround = 1;
        }
        return new SQLitePlugin(openargs, okcb, errorcb);
      }),

      /**
       * Delete a database. This API will be export out
       * @function deleteDb
       * @static
       *
       * @param {array} first
       * values used to delete database
       * @param {function} success
       * Success callback function
       * @param {function} error
       * Error callback function
       */
      deleteDb: function (first, success, error) {
        var args, dblocation;
        args = {};
        if (first.constructor === String) {
          args.path = first;
          args.dblocation = dblocations[0];
        } else {
          if (!(first && first['name'])) {
            throw new Error("Please specify db name");
          }
          args.path = first.name;
          dblocation = !!first.location ? dblocations[first.location] : null;
          args.dblocation = dblocation || dblocations[0];
        }
        delete SQLitePlugin.prototype.openDBs[args.path];

        return cordova.exec(success, error, "StvSQLCipherPlugin", "delete", [args]);
      }
    };

    /**
     * Exported API openDatabase and deleteDatabase
     */
    root.sqlCipherPlugin = {
      sqliteFeatures: {
        isSQLitePlugin: true
      },
      echoTest: function (okcb, errorcb) {
        var error, ok;
        ok = function (s) {
          if (s === 'test-string') {
            return okcb();
          } else {
            return errorcb("Mismatch: got: '" + s + "' expected 'test-string'");
          }
        };
        error = function (e) {
          return errorcb(e);
        };

        return cordova.exec(okcb, errorcb, "StvSQLCipherPlugin", "echoStringValue", [{
          value: 'test-string'
        }]);
      },
      openDatabase: SQLiteFactory.opendb,
      deleteDatabase: SQLiteFactory.deleteDb
    };

  }).call(this);

});