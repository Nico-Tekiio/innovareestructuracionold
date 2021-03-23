/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@Author        Marco Ramirez
 *@Created       25-03-2020
 *@ScriptName    IP - Prospectus Stamping MR
 *@Filename      IP_Prospectus_stamping_MR.js
 *@ScriptID      customscript_efx_ip_stamp_mr
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/record','N/search','N/url','N/https','N/runtime'],

function(record,search,urlMod,https,runtime) {
   
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
            var busqueda_ventas = search.create({
                type:'customrecord_efx_ip_request',
                filters:[['custrecord_efx_ip_status',search.Operator.ANYOF,2,3]
                    ,'and',
                    ['custrecord_efx_ip_tipe',search.Operator.ANYOF,2]
                    ,'and',
                    ['custrecord_efx_ip_stamp',search.Operator.IS,'F']],
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


            var record_peticion = record.load({
                type: 'customrecord_efx_ip_request',
                id: datos.id,
                isDynamic: true,
            });

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_processing',
                value: true,
                ignoreFieldChange: true
            });

            record_peticion.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });


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


        if(data_reduce.custrecord_efx_ip_trans) {
            var data_invoice = {
                folio: '',
                error: ''
            };

            if (!data_invoice.folio) {
                data_invoice = {
                    folio: data_reduce.custrecord_efx_ip_trans.value,
                    error: ''
                };
            }
        }

        //timbrado de factura

        var cfdi_record = record.load({
            type: record.Type.INVOICE,
            id: data_invoice.folio,
            isDynamic: true
        });

        var cfdi_invoice = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_uuid',
        });

        if(!cfdi_invoice){
            var factura_cfdi = timbrar_facturas(data_invoice,id);
        }else{
            var factura_cfdi = cfdi_invoice;
        }

        log.audit({title: 'La factura se timbró con el uuid: ', details: factura_cfdi});

        //timbrado de pago

        //Valida si el pago está o no timbrado

        if(data_reduce.custrecord_efx_ip_payments.length>0){
            var data_payment = {
                folio: [],
                error: ''
            };
            data_payment = {
                folio: data_reduce.custrecord_efx_ip_payments,
                error: ''
            };
        }

        log.audit({title: 'data_payment', details: data_payment});
        var pago_cfdi = new Array();
        for(var p=0;p<data_payment.folio.length;p++) {

            var cfdi_record_payment = record.load({
                type: record.Type.CUSTOMER_PAYMENT,
                id: data_payment.folio[p],
                isDynamic: true
            });

            var cfdi_payment = cfdi_record_payment.getValue({
                fieldId: 'custbody_efx_fe_uuid',
            });

            if (!cfdi_payment) {
                pago_cfdi[p] = timbrar_pago(data_payment.folio[p],id);
            } else {
                pago_cfdi[p] = cfdi_payment;
            }
        }

        log.audit({title: 'El pago se timbró con el uuid: ', details: pago_cfdi});


        var record_peticion = record.load({
            type: 'customrecord_efx_ip_request',
            id: id,
            isDynamic: true,
        });

        if(data_invoice.error || data_payment.error || !factura_cfdi){
            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_status',
                value: 3,
                ignoreFieldChange: true
            });
        }else{
            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_status',
                value: 2,
                ignoreFieldChange: true
            });
        }

        if(factura_cfdi){
            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_stamp',
                value: true,
                ignoreFieldChange: true
            });
        }


        record_peticion.setValue({
            fieldId: 'custrecord_efx_ip_processing',
            value: false,
            ignoreFieldChange: true
        });

        record_peticion.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {

    }

    function timbrar_pago(data_payment,id) {
        try {
            var SLURL = '';
            var urlExterna = true;
            var scheme = '';
            var host = '';
            if (!urlExterna) {
                scheme = 'https://';
                host = urlMod.resolveDomain({
                    hostType: urlMod.HostType.APPLICATION
                });

            }
            SLURL = scheme + host + urlMod.resolveScript({
                scriptId: 'customscript_efx_fe_complemento_sl',
                deploymentId: 'customdeploy_efx_fe_com_pago_auto_sl',
                returnExternalUrl: urlExterna,
                params: {
                    custparam_tranid: data_payment,
                    custparam_trantype: record.Type.CUSTOMER_PAYMENT,
                    custparam_pa: 'T',

                }
            });

            log.audit({title: 'SLURL_payment', details: JSON.stringify(SLURL)});

            if (SLURL) {
                var header = {
                    "Content-Type": 'application/json'
                }
                var response = https.get({
                    headers: header,
                    // url: SLURL
                    url: SLURL
                });

                log.audit({title: 'response_payment ', details: response});

                var responseCode = response.code || '';
                var responseBody = response.body || '';

                log.audit({title: 'responseCode_payment', details: responseCode});
                log.audit({title: 'responseBody_payment', details: responseBody});

                var record_peticion = record.load({
                    type: 'customrecord_efx_ip_request',
                    id: id,
                    isDynamic: true,
                });

                var message = record_peticion.getValue({
                    fieldId: 'custrecord_efx_ip_cfdi_message'
                });

                record_peticion.setValue({
                    fieldId: 'custrecord_efx_ip_cfdi_message',
                    value: 'Factura: '+message+' Pago: '+responseBody,
                    ignoreFieldChange: true
                });
                record_peticion.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
            }
        } catch (e) {
            log.error({ title: 'Error payment_cfdi', details: JSON.stringify(e) });
        }
        var cfdi_record = record.load({
            type: record.Type.CUSTOMER_PAYMENT,
            id: data_payment,
            isDynamic: true
        });

        var cfdi_payment = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_uuid',
        });

        return cfdi_payment;
    }

    function timbrar_facturas(data_invoice,id){
        try {
            var SLURL = '';

            SLURL = urlMod.resolveScript({
                scriptId: 'customscript_efx_fe_cfdi_sl',
                deploymentId: 'customdeploy_efx_fe_cfdi_sl',
                returnExternalUrl: true,
                params: {
                    custparam_tranid: data_invoice.folio,
                    custparam_trantype: record.Type.INVOICE,
                    custparam_pa: 'T',
                    custparam_response: 'T',
                }
            });

            log.audit({title: 'SLURL', details: JSON.stringify(SLURL)});

            if (SLURL) {
                var header = {
                    "Content-Type": 'application/json'
                }
                var response = https.get({
                    headers: header,
                    // url: SLURL
                    url: SLURL
                });

                log.audit({title: 'response ', details: response});

                var responseCode = response.code || '';
                var responseBody = response.body || '';

                log.audit({title: 'responseCode', details: responseCode});
                log.audit({title: 'responseBody', details: responseBody});

                var record_peticion = record.load({
                    type: 'customrecord_efx_ip_request',
                    id: id,
                    isDynamic: true,
                });
                record_peticion.setValue({
                    fieldId: 'custrecord_efx_ip_cfdi_message',
                    value: responseBody,
                    ignoreFieldChange: true
                });
                record_peticion.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
            }
        } catch (e) {
            log.error({ title: 'Error invoice_cfdi', details: JSON.stringify(e) });

        }

        var cfdi_record = record.load({
            type: record.Type.INVOICE,
            id: data_invoice.folio,
            isDynamic: true
        });

        var cfdi = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_uuid',
        });

        return cfdi;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
    
});
