/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@Author        Marco Ramirez
 *@Created       26-03-2020
 *@ScriptName    IP - Cleaner MR
 *@Filename      IP_cleaner_MR.js
 *@ScriptID      customscript_efx_ip_cleaner_mr
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
            var date = new Date();
            var date_month = date.getMonth();
            var date_year = date.getFullYear();
            if(date_month==0){
                date_month=9;
                date_year = date_year-1;
            }else if(date_month==1){
                date_month=10;
                date_year = date_year-1;
            }else if(date_month==2){
                date_month=11;
                date_year = date_year-1;
            }else{
                date_month=date_month-3;
            }

             date_month=3;
             date_year=2020;
             var date_day = 5;
            //
            // date.setDate(date_day);
            // date.setMonth(date_month);
            // date.setFullYear(date_year);

            log.audit({title: 'date', details: date});

            //var date_clean = date.getDate()+'/'+(date_month+1)+'/'+date_year;
            var date_clean = date_day+'/'+(date_month+1)+'/'+date_year;

            log.audit({title:'date_clean',details:date_clean});

            var busqueda_ventas = search.create({
                type:'customrecord_efx_ip_request',
                filters:[['custrecord_efx_ip_status',search.Operator.ANYOF,2]
                    ,'and',
                    ['created',search.Operator.ONORBEFORE,date_clean]
                    ,'and',
                    ['custrecord_efx_ip_tipe',search.Operator.ANYOF,1,2]
                    ],
                columns:[
                    search.createColumn({name: 'name'}),
                    search.createColumn({name: 'created'}),
                    search.createColumn({name: 'lastmodified'}),
                    search.createColumn({name: 'custrecord_efx_ip_tipe'}),
                    search.createColumn({name: 'custrecord_efx_ip_processing'}),
                    search.createColumn({name: 'custrecord_efx_ip_stamp'}),
                    search.createColumn({name: 'custrecord_efx_ip_status'}),
                    search.createColumn({name: 'custrecord_efx_ip_request'}),
                    search.createColumn({name: 'custrecord_efx_ip_customer'}),
                    search.createColumn({name: 'custrecord_efx_ip_trans'}),
                    search.createColumn({name: 'custrecord_efx_ip_payments'}),
                ]
            });
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
        var peticion = JSON.parse(data_reduce.custrecord_efx_ip_request);

        log.audit({title: 'data_reduce', details: data_reduce});
        log.audit({title: 'id', details: id});
        log.audit({title: 'peticion', details: peticion});

        var featureRecord = record.delete({
            type: 'customrecord_efx_ip_request',
            id: id,
        });

        log.audit({title: 'registros eliminados', details: featureRecord});

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
