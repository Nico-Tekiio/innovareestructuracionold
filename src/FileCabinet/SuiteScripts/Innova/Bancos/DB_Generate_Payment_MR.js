/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/runtime','N/record','N/task'],

function(search,runtime,record,task) {
   
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
            var scriptObj = runtime.getCurrentScript();
            var idRegistro = scriptObj.getParameter({name: 'custscript_efx_db_rec_id'});

            log.audit({title:'idRegistro',details:idRegistro});

            if(!idRegistro) {
                var busqueda_ventas = search.create({
                    type: 'customrecord_efx_db_txt_banco',
                    filters: [['custrecord_efx_db_pending', search.Operator.ANYOF, 1]
                        , 'and',
                        ['isinactive', search.Operator.IS, 'F']],
                    columns: [
                        search.createColumn({name: 'name'}),
                        search.createColumn({name: 'custrecord_efx_db_txt'}),
                        search.createColumn({name: 'custrecord_efx_db_pending'}),
                        search.createColumn({name: 'custrecord_efx_db_eployee'}),
                    ]
                });

                return busqueda_ventas;
            }else{

                var busqueda_ventas = search.create({
                    type: 'customrecord_efx_db_txt_banco',
                    filters: [['internalid', search.Operator.ANYOF, idRegistro]
                        , 'and',
                        ['isinactive', search.Operator.IS, 'F']],
                    columns: [
                        search.createColumn({name: 'name'}),
                        search.createColumn({name: 'custrecord_efx_db_txt'}),
                        search.createColumn({name: 'custrecord_efx_db_pending'}),
                        search.createColumn({name: 'custrecord_efx_db_eployee'}),
                    ]
                });

                return busqueda_ventas;

            }
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
        var articulo_recargo = scriptObj.getParameter({name: 'custscript_efx_db_item_surcharge'});
        log.audit({title:'reduce-context',details:context});
        var data_reduce = JSON.parse(context.values[0]);
        var id = JSON.parse(context.key);
        try {

            //busqueda de detalle de archivo
            var busqueda_lineas = search.create({
                type: 'customrecord_efx_db_txt_detalle',
                filters: [['custrecord_efx_db_tb', search.Operator.ANYOF, id]
                    , 'and',
                    ['isinactive', search.Operator.IS, 'F']
                    , 'and',
                    ['custrecord_efx_db_processed', search.Operator.IS, 'F']
                    , 'and',
                    ['custrecord_efx_db_abono', search.Operator.IS, 'T']],
                columns: [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'custrecord_efx_db_tb'}),
                    search.createColumn({name: 'custrecord_efx_db_line'}),
                    search.createColumn({name: 'custrecord_efx_db_payment'}),
                    search.createColumn({name: 'custrecord_efx_db_processed'}),
                    search.createColumn({name: 'custrecord_efx_db_pago'}),
                    search.createColumn({name: 'custrecord_efx_db_reference'}),
                    search.createColumn({name: 'custrecord_efx_db_abono'}),
                ]
            });

            var ejecutar_lineas = busqueda_lineas.run();
            var resultado_lineas = ejecutar_lineas.getRange(0, 100);


            var linea_referencia = new Array();
            var lineas_array = [];
            for (var y = 0; y < resultado_lineas.length; y++) {
                var linea_internalid = resultado_lineas[y].getValue({name: 'internalid'}) || '';
                var linea_cabecera = resultado_lineas[y].getValue({name: 'custrecord_efx_db_tb'}) || '';
                var linea_linea = resultado_lineas[y].getValue({name: 'custrecord_efx_db_line'}) || '';
                var linea_pago = resultado_lineas[y].getValue({name: 'custrecord_efx_db_payment'}) || '';
                var linea_procesado = resultado_lineas[y].getValue({name: 'custrecord_efx_db_processed'}) || '';
                var linea_importe = resultado_lineas[y].getValue({name: 'custrecord_efx_db_pago'}) || '';
                linea_referencia[y] = resultado_lineas[y].getValue({name: 'custrecord_efx_db_reference'}) || '';
                var linea_abono = resultado_lineas[y].getValue({name: 'custrecord_efx_db_abono'}) || '';

                lineas_array.push({
                    linea_internalid: linea_internalid,
                    linea_cabecera: linea_cabecera,
                    linea_linea: linea_linea,
                    linea_pago: linea_pago,
                    linea_procesado: linea_procesado,
                    linea_importe: linea_importe,
                    linea_referencia: linea_referencia[y],
                    linea_abono: linea_abono
                });
            }
            log.audit({title:'linea_referencia',details:linea_referencia});
            log.audit({title:'lineas_array',details:lineas_array});

            var filtro_referencia = new Array();
            var fc = 0;
            for (var x = 0; x < linea_referencia.length; x++) {
                fc++;
                filtro_referencia.push(['custbody_ref_banc', search.Operator.IS, linea_referencia[x]]);
                if (fc < linea_referencia.length) {
                    filtro_referencia.push('OR');
                }
            }
            log.audit({title:'filtro_referencia',details:filtro_referencia});
            //busqueda de facturas por referencia
            if(filtro_referencia.length>0) {

                var facturas_array = buscar_factura(filtro_referencia);
                var alumno_active = new Array();

                log.audit({title:'facturas_array',details:facturas_array});

                for (var fa = 0; fa < facturas_array.length; fa++) {

                    var fa_record = record.load({
                        type: record.Type.INVOICE,
                        id: facturas_array[fa].fac_internalid,
                        isDynamic: false
                    });

                    var alumno_line = fa_record.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_ip_idchild',
                            line: 0
                        });

                    log.audit({title:'alumno_line',details:alumno_line});
                    var cli_record = record.load({
                        type: record.Type.CUSTOMER,
                        id: alumno_line,
                        isDynamic: false
                    });

                    alumno_active[fa] =  cli_record.getValue('isinactive');

                    log.audit({title:'alumno_active',details:alumno_active});


                    if(!alumno_active[fa]) {
                        var facturas_recargo = buscar_recargo(articulo_recargo, facturas_array[fa].fac_entity);

                        log.audit({title: 'facturas_recargo', details: facturas_recargo});
                        for (var la = 0; la < lineas_array.length; la++) {
                            if (facturas_array[fa].fac_referencia == lineas_array[la].linea_referencia) {

                                if (!lineas_array[la].linea_pago) {
                                    var recargos_pagados = 0;

                                    var a_pagar = lineas_array[la].linea_importe;
                                    log.audit({title: 'a_pagar-1', details: a_pagar});

                                    if (facturas_recargo.length > 0) {
                                        var recargos_array = pagar_recargo(facturas_recargo, a_pagar);
                                        log.audit({title: 'recargos_array', details: recargos_array});
                                        recargos_pagados++;
                                        a_pagar = recargos_array;
                                        log.audit({title: 'a_pagar-recargo', details: a_pagar});
                                    }
                                    log.audit({title: 'a_pagar-2', details: a_pagar});

                                    if(a_pagar>0){
                                        var registro_payment = record.transform({
                                            fromType: record.Type.INVOICE,
                                            fromId: facturas_array[fa].fac_internalid,
                                            toType: record.Type.CUSTOMER_PAYMENT
                                        });

                                        registro_payment.setValue({
                                            fieldId: "custbody_ref_banc",
                                            value: lineas_array[la].linea_referencia,
                                            ignoreFieldChange: true
                                        });

                                        registro_payment.setValue({
                                            fieldId: "custbody_efx_fe_formapago",
                                            value: facturas_array[fa].fac_Fpago,
                                            ignoreFieldChange: true
                                        });

                                        registro_payment.setValue({
                                            fieldId: "custbody_efx_fe_metodopago",
                                            value: facturas_array[fa].fac_Mpago,
                                            ignoreFieldChange: true
                                        });

                                        registro_payment.setValue({
                                            fieldId: "custbody_efx_fe_usocfdi",
                                            value: facturas_array[fa].fac_Ucfdi,
                                            ignoreFieldChange: true
                                        });

                                        var linecount = registro_payment.getLineCount({
                                            sublistId: 'apply'
                                        });

                                        for (var lc = 0; lc < linecount; lc++) {

                                            var factura = registro_payment.getSublistValue({
                                                sublistId: 'apply',
                                                fieldId: 'internalid',
                                                line: lc
                                            });

                                            if (facturas_array[fa].fac_internalid == factura) {
                                                registro_payment.setSublistValue({
                                                    sublistId: 'apply',
                                                    fieldId: 'amount',
                                                    line: lc,
                                                    value: a_pagar
                                                });
                                            }
                                        }

                                        var id_registro_payment = registro_payment.save({
                                            enableSourcing: true,
                                            ignoreMandatoryFields: true
                                        });
                                    }

                                    if(recargos_pagados>0){
                                        var record_linea = record.load({
                                            type: 'customrecord_efx_db_txt_detalle',
                                            id: lineas_array[la].linea_internalid,
                                            isDynamic: true,
                                        });


                                        record_linea.setValue({
                                            fieldId: 'custrecord_efx_db_processed',
                                            value: true,
                                            ignoreFieldChange: true
                                        });

                                        record_linea.setValue({
                                            fieldId: 'custrecord_efx_db_notes',
                                            value: 'Se pagaron facturas de recargo',
                                            ignoreFieldChange: true
                                        });
                                        record_linea.save({
                                            enableSourcing: true,
                                            ignoreMandatoryFields: true
                                        });
                                    }

                                    if (id_registro_payment) {
                                        var texto_recargo='';
                                        if(recargos_pagados>0){
                                            texto_recargo ='Se pagaron facturas de recargo';
                                        }
                                        var record_linea = record.load({
                                            type: 'customrecord_efx_db_txt_detalle',
                                            id: lineas_array[la].linea_internalid,
                                            isDynamic: true,
                                        });

                                        record_linea.setValue({
                                            fieldId: 'custrecord_efx_db_payment',
                                            value: id_registro_payment,
                                            ignoreFieldChange: true
                                        });

                                        record_linea.setValue({
                                            fieldId: 'custrecord_efx_db_processed',
                                            value: true,
                                            ignoreFieldChange: true
                                        });

                                        record_linea.setValue({
                                            fieldId: 'custrecord_efx_db_notes',
                                            value: 'Se generó el pago: ' + id_registro_payment +' '+texto_recargo,
                                            ignoreFieldChange: true
                                        });
                                        record_linea.save({
                                            enableSourcing: true,
                                            ignoreMandatoryFields: true
                                        });
                                    }



                                }
                            } else {
                                var record_linea = record.load({
                                    type: 'customrecord_efx_db_txt_detalle',
                                    id: lineas_array[la].linea_internalid,
                                    isDynamic: true,
                                });


                                record_linea.setValue({
                                    fieldId: 'custrecord_efx_db_processed',
                                    value: true,
                                    ignoreFieldChange: true
                                });

                                record_linea.setValue({
                                    fieldId: 'custrecord_efx_db_notes',
                                    value: 'No se encontró factura para esta referencia',
                                    ignoreFieldChange: true
                                });

                                record_linea.save({
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                });
                            }
                        }
                    }
                }

            }
            var record_cabecera = record.load({
                type: 'customrecord_efx_db_txt_banco',
                id: id,
                isDynamic: true,
            });
            if(alumno_active[fa]  || facturas_array.length<=0) {
                record_cabecera.setValue({
                    fieldId: 'custrecord_efx_db_pending',
                    value: 3,
                    ignoreFieldChange: true
                });
            }else{
                record_cabecera.setValue({
                    fieldId: 'custrecord_efx_db_pending',
                    value: 2,
                    ignoreFieldChange: true
                });
            }

            record_cabecera.setValue({
                fieldId: 'custrecord_efx_db_processing',
                value: false,
                ignoreFieldChange: true
            });

            record_cabecera.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        }catch(error_reduce){
            log.audit({title:'error_reduce',details:error_reduce});
            var record_cabecera = record.load({
                type: 'customrecord_efx_db_txt_banco',
                id: id,
                isDynamic: true,
            });


            record_cabecera.setValue({
                fieldId: 'custrecord_efx_db_pending',
                value: 3,
                ignoreFieldChange: true
            });

            record_cabecera.setValue({
                fieldId: 'custrecord_efx_db_processing',
                value: false,
                ignoreFieldChange: true
            });

            record_cabecera.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
        }

        if(facturas_array.length>0){

            var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
            mrTask.scriptId = 'customscript_efx_db_inv_mr';
            mrTask.deploymentId = 'customdeploy_efx_db_inv_mr';
            mrTask.params = {custscript_efx_db_facturas: facturas_array};
            log.audit({title:'parametros',details:mrTask.params});

            var mrTaskId = mrTask.submit();

            return mrTaskId;
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

    function buscar_factura(filtro_referencia) {

        var busqueda_facturas = search.create({
            type: search.Type.INVOICE,
            filters: [filtro_referencia
                , 'and',
                ['status', search.Operator.IS, 'CustInvc:A']
                , 'and',
                ['mainline', search.Operator.IS, 'T']
                , 'and',
                ['taxline', search.Operator.IS, 'F']
            ],
            columns: [
                search.createColumn({name: 'internalid'}),
                search.createColumn({name: 'custbody_ref_banc'}),
                search.createColumn({name: 'entity'}),
                search.createColumn({name: 'custbody_efx_fe_formapago'}),
                search.createColumn({name: 'custbody_efx_fe_metodopago'}),
                search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
            ]
        });

        log.audit({title: 'busqueda_facturas', details: busqueda_facturas});

        var ejecutar_facturas = busqueda_facturas.run();
        log.audit({title: 'ejecutar_facturas', details: ejecutar_facturas});
        var resultado_facturas = ejecutar_facturas.getRange(0, 100);
        log.audit({title: 'resultado_facturas', details: resultado_facturas});

        var facturas_array = [];
        for (var i = 0; i < resultado_facturas.length; i++) {
            var fac_internalid = resultado_facturas[i].getValue({name: 'internalid'}) || '';
            var fac_referencia = resultado_facturas[i].getValue({name: 'custbody_ref_banc'}) || '';
            var fac_entity = resultado_facturas[i].getValue({name: 'entity'}) || '';
            var fac_Fpago = resultado_facturas[i].getValue({name: 'custbody_efx_fe_formapago'}) || '';
            var fac_Mpago = resultado_facturas[i].getValue({name: 'custbody_efx_fe_metodopago'}) || '';
            var fac_Ucfdi = resultado_facturas[i].getValue({name: 'custbody_efx_fe_usocfdi'}) || '';


            facturas_array.push({
                fac_internalid: fac_internalid,
                fac_referencia: fac_referencia,
                fac_entity:fac_entity,
                fac_Fpago:fac_Fpago,
                fac_Mpago:fac_Mpago,
                fac_Ucfdi:fac_Ucfdi
            });
        }

        return facturas_array;
    }

    function buscar_recargo(articulo,cliente) {
        try {
            var busqueda_recargo = search.create({
                type: search.Type.INVOICE,
                filters: [
                    ['status', search.Operator.IS, 'CustInvc:A']
                    , 'and',
                    ['mainline', search.Operator.IS, 'F']
                    , 'and',
                    ['taxline', search.Operator.IS, 'F']
                    , 'and',
                    ['name', search.Operator.IS, cliente],
                    'and',
                    ['item', search.Operator.IS, articulo]
                ],
                columns: [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'custbody_ref_banc'}),
                    search.createColumn({name: 'entity'}),
                    search.createColumn({name: 'fxamount'}),
                    search.createColumn({name: 'custbody_efx_fe_formapago'}),
                    search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
                ]
            });
            var ejecutar_recargo = busqueda_recargo.run();
            log.audit({title: 'ejecutar_recargo', details: ejecutar_recargo});
            var resultado_recargo = ejecutar_recargo.getRange(0, 100);
            log.audit({title: 'resultado_recargo', details: resultado_recargo});
            var ids_recargos = [];

            var recargos_array = [];
            for (var i = 0; i < resultado_recargo.length; i++) {
                ids_recargos[i]=resultado_recargo[i].getValue({name: 'internalid'}) || '';
                var fac_internalid = resultado_recargo[i].getValue({name: 'internalid'}) || '';
                var fac_monto = resultado_recargo[i].getValue({name: 'fxamount'}) || '';
                var fac_fpago = resultado_recargo[i].getValue({name: 'custbody_efx_fe_formapago'}) || '';
                var fac_usocfdi = resultado_recargo[i].getValue({name: 'custbody_efx_fe_usocfdi'}) || '';

                recargos_array.push({
                    fac_internalid: fac_internalid,
                    fac_monto:fac_monto,
                    fac_fpago:fac_fpago,
                    fac_usocfdi:fac_usocfdi,

                });
            }

            var busqueda_recargo_rest = search.create({
                type: search.Type.INVOICE,
                filters: [
                    // ['custbody_efx_fe_factura_global', search.Operator.ANYOF, '@NONE@']
                    // , 'and',

                    ['mainline', search.Operator.IS, 'T']
                    , 'and',
                    ['internalid', search.Operator.ANYOF, ids_recargos]

                ],
                columns: [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'amountremaining'}),
                ]
            });
            var ejecutar_recargo_rest = busqueda_recargo_rest.run();

            var resultado_recargo_rest = ejecutar_recargo_rest.getRange(0, 100);
            for (var x = 0; x < resultado_recargo_rest.length; x++) {
                recargos_array[x].fac_monto= resultado_recargo_rest[x].getValue({name: 'amountremaining'});
            }

            return recargos_array;
        }catch(error_recargo){
            log.audit({title: 'error_recargo', details: error_recargo});
        }
    }

    function pagar_recargo(facturas_recargo,a_pagar){
        log.audit({title:'facturas_recargo.length-1',details:facturas_recargo.length});
        try {
            for (var x = 0; x < facturas_recargo.length; x++) {
                log.audit({title:'a_pagar',details:a_pagar});
                log.audit({title:'facturas_recargo[x].fac_monto',details:facturas_recargo[x].fac_monto});

                //if (parseFloat(a_pagar) >= parseFloat(facturas_recargo[x].fac_monto)) {
                if (parseFloat(a_pagar) > 0) {
                    var registro_payment = record.transform({
                        fromType: record.Type.INVOICE,
                        fromId: facturas_recargo[x].fac_internalid,
                        toType: record.Type.CUSTOMER_PAYMENT
                    });

                    var linecount = registro_payment.getLineCount({
                        sublistId: 'apply'
                    });

                    if(facturas_recargo[x].fac_monto>a_pagar){
                        registro_payment.setValue({
                            fieldId: 'custbody_efx_fe_formapago',
                            value: facturas_recargo[x].fac_fpago
                        });

                        registro_payment.setValue({
                            fieldId: 'custbody_efx_fe_usocfdi',
                            value: facturas_recargo[x].fac_usocfdi
                        });

                        registro_payment.setValue({
                            fieldId: 'custbody_efx_fe_metodopago',
                            // value: data_reduce.custbody_efx_fe_metodopago.value
                            value: 2
                        });
                    }

                    for (var lc = 0; lc < linecount; lc++) {

                        var factura = registro_payment.getSublistValue({
                            sublistId: 'apply',
                            fieldId: 'internalid',
                            line: lc
                        });

                        if (facturas_recargo[x].fac_internalid == factura) {
                            registro_payment.setSublistValue({
                                sublistId: 'apply',
                                fieldId: 'amount',
                                line: lc,
                                value: a_pagar
                            });
                        }
                    }

                    var id_registro_payment = registro_payment.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                    log.audit({title:'id_registro_payment',details:id_registro_payment});
                    if(facturas_recargo[x].fac_monto>a_pagar){
                        a_pagar=0;
                        if(id_registro_payment){

                        }
                    }else{
                        a_pagar = a_pagar - facturas_recargo[x].fac_monto;
                    }
                }
            }
            log.audit({title:'a_pagar',details:a_pagar});
            return a_pagar;
        }catch(error_pagar_recargo){
            log.audit({title:'error_pagar_recargo',details:error_pagar_recargo});
        }
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
