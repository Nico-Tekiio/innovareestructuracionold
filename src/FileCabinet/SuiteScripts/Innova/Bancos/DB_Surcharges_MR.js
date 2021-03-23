/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/runtime','N/record'],

function(search,runtime,record) {
   
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
        var busqueda_facturas = search.create({
            type: search.Type.INVOICE,
            filters: [
                ['status', search.Operator.IS, 'CustInvc:A']
                , 'and',
                ['mainline', search.Operator.IS, 'T']
                , 'and',
                ['taxline', search.Operator.IS, 'F']
                ,'and',
                ['amountremaining', search.Operator.GREATERTHAN, 0]
                ,'and',
                //['internalid',search.Operator.IS,'65482']
                // ,'and',
                ['trandate',search.Operator.ONORBEFORE,'tendaysago']
            ],
            columns: [
                search.createColumn({name: 'internalid'}),
                search.createColumn({name: 'custbody_ref_banc'}),
                search.createColumn({name: 'amountremaining'}),
                // search.createColumn({name: 'amount'}),
                search.createColumn({name: 'fxamount'}),
                search.createColumn({name: 'fxamountremaining'}),
                search.createColumn({name: 'entity'}),
                search.createColumn({name: 'location'}),
                search.createColumn({name: 'custbody_efx_fe_entity_timbra'}),
                search.createColumn({name: 'custbody_efx_fe_formapago'}),
                search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
                search.createColumn({name: 'custbody_efx_fe_metodopago'}),
            ]
        });
        return busqueda_facturas;
    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        try{
            log.audit({title:'map',details:JSON.parse(context.value)});
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
        var scriptObj = runtime.getCurrentScript();
        var porcentaje_recargo = scriptObj.getParameter({name: 'custscript_efx_db_surchargepercent'});
        var articulo_recargo = scriptObj.getParameter({name: 'custscript_efx_db_item_surcharge'});
        log.audit({title:'reduce-context',details:context});
        var data_reduce = JSON.parse(context.values[0]);
        var id = JSON.parse(context.key);

        log.audit({title:'total pendiente',details:data_reduce.amountremaining});

        var total_factura = parseFloat(data_reduce.amountremaining);

        var recargo = (total_factura*parseFloat(porcentaje_recargo))/100;

        var recargo_desglose = parseFloat(recargo)/1.16;

        try{
            var record_invoice = record.create({
                type: record.Type.INVOICE,
            });

            log.audit({title:'data_reduce.entity.value',details:data_reduce.entity.value});
            record_invoice.setValue({
                fieldId: 'entity',
                value: data_reduce.entity.value
            });

            record_invoice.setValue({
                fieldId: 'subsidiary',
                value: data_reduce.entity.value
            });

            log.audit({title:'data_reduce.location.value',details:data_reduce.location.value});
            record_invoice.setValue({
                fieldId: 'location',
                value: data_reduce.location.value
            });

            // record_invoice.setValue({
            //     fieldId: 'custbody_efx_fe_entity_timbra',
            //     value: data_reduce.custbody_efx_fe_entity_timbra
            // });

            log.audit({title:'data_reduce.location.value',details:data_reduce.location.value});
            record_invoice.setValue({
                fieldId: 'custbody_efx_fe_formapago',
                value: data_reduce.custbody_efx_fe_formapago.value
            });

            record_invoice.setValue({
                fieldId: 'custbody_efx_fe_usocfdi',
                value: data_reduce.custbody_efx_fe_usocfdi.value
            });

            record_invoice.setValue({
                fieldId: 'custbody_efx_fe_metodopago',
                // value: data_reduce.custbody_efx_fe_metodopago.value
                value: 1
            });

            record_invoice.setSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: 0,
                value: articulo_recargo
            });

            record_invoice.setSublistValue({
                sublistId: 'item',
                fieldId: 'quantity',
                line: 0,
                value: 1
            });

            record_invoice.setSublistValue({
                sublistId: 'item',
                fieldId: 'rate',
                line: 0,
                value: recargo_desglose
            });

            var id_registro_invoice = record_invoice.save({
                enableSourcing: true,
                igonoreMandatoryFields: true
            });

            log.audit({title:'id_registro_invoice',details:id_registro_invoice});

        }catch(error_factura){
            log.audit({title:'error_factura',details:error_factura});
        }



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
