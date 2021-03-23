/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@Author        Marco Ramirez
 *@Created       27-03-2020
 *@ScriptName    IP - Apply registration MR
 *@Filename      IP_Apply_registration_MR.js
 *@ScriptID      customscript_efx_ip_apply_rep_mr
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/record','N/search'],

    function(record,search) {

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @typedef {Object} ObjectRef
         * @property {number} id - Internal ID of the record instance
         * @property {string} type - Record type id
         *
         * @return {Array|Object|Search|RecordRef} inputSummary
         * @since 2015.1
         */
        function getInputData() {
            try{

                var startdate = new Date();
                var enddate = new Date();
                var start_year = startdate.getFullYear();

                var start_date = '';
                var end_date = '';

                start_date = '01/09/'+start_year;
                end_date = '30/09/'+start_year;

                var period_search = search.create({
                    type: search.Type.ACCOUNTING_PERIOD,
                    filters: [['startdate', search.Operator.ON, start_date], 'AND', ['enddate', search.Operator.ON, end_date]],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'periodname'})
                    ]
                });

                var ejecutar_period = period_search.run();
                var resultado_period = ejecutar_period.getRange(0, 100);

                var internalid_period = '';
                var name_period = '';

                for (var p = 0; p < resultado_period.length; p++) {
                    internalid_period = resultado_period[p].getValue({name: 'internalid'}) || '';
                    name_period = resultado_period[p].getValue({name: 'periodname'}) || '';
                }

                log.audit({title: 'internalid_period', details: internalid_period});


                var busqueda_ventas = search.create({
                    type:search.Type.INVOICE,
                    filters:[['taxline',search.Operator.IS,'F']
                        ,'and',
                        ['mainline',search.Operator.IS,'T']
                        ,'and',
                        ['custbody_efx_ip_tid',search.Operator.ISNOTEMPTY,'']
                        ,'and',
                        //['trandate',search.Operator.BEFORE,'startofthismonth']
                        ['trandate',search.Operator.ONORBEFORE,'01/09/2020']
                        ,'and',
                        ['trandate',search.Operator.AFTER,'samemonthlastfiscalyear']
                        ,'and',
                        ['status',search.Operator.ANYOF,'CustInvc:A']
                        ,'and',
                        ['postingperiod',search.Operator.ANYOF,internalid_period]
                        ,'and',
                        ['amount',search.Operator.GREATERTHAN,'0.00']

                    ],
                    columns:[
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'tranid'})

                    ]
                });

                log.audit({title:'busqueda_ventas',details:busqueda_ventas.length});
                log.audit({title:'busqueda_ventas',details:busqueda_ventas});

                return busqueda_ventas;
            }catch(error){
                log.error({title:'getInputData - error',details:error});
            }
        }

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         *
         * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
         * @since 2015.1
         */
        function map(context) {
            log.audit({title:'map',details:JSON.parse(context.value)});

            try{
                var datos = JSON.parse(context.value);

                log.audit({title:'map - values',details:datos.values});
                var peticion = datos.id;
                context.write({
                    key: peticion,
                    value: datos.values
                });
            }catch(error){
                log.error({title:'map - error',details:error});
            }
        }

        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
         * @since 2015.1
         */
        function reduce(context) {
            var data_reduce = JSON.parse(context.values[0]);
            var id = JSON.parse(context.key);

            log.audit({title: 'id', details: id});
            log.audit({title: 'data_reduce', details: data_reduce});

            var record_invoice = record.load({
                type: record.Type.INVOICE,
                id: id,
                isDynamic: true
            });

            var lineItem = record_invoice.getLineCount({
                sublistId: 'item'
            });

            var pg_client =  record_invoice.getValue('custbody_efx_fe_entity_timbra');

            var fecha_pago = new Date();
            var pagos=new Array();

            log.audit({title: 'lineItem', details: lineItem});

            for(var i=0;i<lineItem;i++){
                var item = record_invoice.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'item',
                    line: i
                });
                log.audit({title: 'item', details: item});
                try {
                    var record_item = record.load({
                        type: record.Type.SERVICE_ITEM,
                        id: item,
                        isDynamic: true
                    });
                }catch(error_item){
                    log.audit({title: 'error_item', details: error_item});
                }

                var item_type = record_item.getValue('itemtype');
                log.audit({title: 'item_type', details: item_type});
                if(item_type!='Discount'){
                    var tipo_articulo = record_item.getValue('custitem_efx_ip_item_type');
                }
            }
            log.audit({title: 'tipo_articulo', details: tipo_articulo});

            if(tipo_articulo == 3){

                try {
                    var registro_payment = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: id,
                        toType: record.Type.CUSTOMER_PAYMENT
                    });
                    log.audit({title: 'pg_client', details: pg_client});

                    if (pg_client) {
                        registro_payment.setValue({
                            fieldId: 'custbody_efx_fe_entity_timbra',
                            value: pg_client
                        });
                    }
                    log.audit({title: 'fecha_pago', details: fecha_pago});
                    registro_payment.setValue({
                        fieldId: "custbody_efx_fe_fecha_de_pago",
                        value: fecha_pago,
                        ignoreFieldChange: true
                    });

                    registro_payment.setValue({
                        fieldId: 'custbody_efx_ip_glimpact',
                        value: true
                    });

                    var linecount_deposit = registro_payment.getLineCount({
                        sublistId: 'deposit'
                    });

                    log.audit({title: 'linecount_deposit', details: linecount_deposit});

                    for (var lc = 0; lc < linecount_deposit; lc++) {

                        var deposito = registro_payment.getSublistValue({
                            sublistId: 'deposit',
                            fieldId: 'doc',
                            line: lc
                        });

                        log.audit({title: 'deposito', details: deposito});

                        registro_payment.setSublistValue({
                            sublistId: 'deposit',
                            fieldId: 'apply',
                            line: lc,
                            value: true
                        });

                    }
                    var id_registro_payment = registro_payment.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });

                    log.audit({title: 'id_registro_payment', details: id_registro_payment});
                }catch(error_p){
                    log.audit({title: 'error payment', details: error_p});
                }
            }

            log.audit({title: 'id_registro_payment', details: id_registro_payment});
        }


        /**
         * Executes when the summarize entry point is triggered and applies to the result set.
         *
         * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
         * @since 2015.1
         */
        function summarize(summary) {

        }

        return {
            getInputData: getInputData,
            map: map,
            reduce: reduce,
            summarize: summarize
        };

    });
