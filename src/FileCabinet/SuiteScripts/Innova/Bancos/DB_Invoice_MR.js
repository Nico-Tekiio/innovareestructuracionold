/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/redirect','N/https','N/runtime', 'N/search','N/url','N/file','N/render','N/xml','N/email'],

function(record, redirect,https,runtime, search,urlMod,file,render,xmls,email) {

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

        try {
            var scriptObj = runtime.getCurrentScript();
            var idRegistro = scriptObj.getParameter({name: 'custscript_efx_db_facturas'});
            log.audit({title: 'idRegistro', details: idRegistro});

            if(!idRegistro) {
                var busqueda_facturas = search.create({
                    type: search.Type.INVOICE,
                    filters: [
                        [[[['custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                            , 'and',
                            ['custbody_efx_fe_pdf_file_ns', search.Operator.ISEMPTY, '']
                            , 'and',
                            ['custbody_efx_fe_xml_file_ns', search.Operator.ISEMPTY, '']]
                            , 'and',
                            ['status', search.Operator.ANYOF, 'CustInvc:A', 'CustInvc:B']]
                        // ,'or',
                        //     ['custbody_efx_fe_num_parcialidad', search.Operator.GREATERTHAN, 1]
                        ]
                        , 'and',
                        ['mainline', search.Operator.IS, 'T']
                        , 'and',
                        ['taxline', search.Operator.IS, 'F']
                        //, 'and',
                        //['internalid', search.Operator.IS, '14438']
                        //  ,'and',
                        //  ['trandate',search.Operator.ONORAFTER,'yesterday']
                        ,'or',
                        [
                            ['payingtransaction', search.Operator.NONEOF, '@NONE@']
                            ,'and',
                            ['payingtransaction.custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                            ,'and',
                            ['custbody_efx_fe_uuid', search.Operator.ISNOTEMPTY, '']
                            ,'and',
                            ['custbody_efx_fe_metodopago', search.Operator.ANYOF, 2]
                            , 'and',
                            ['mainline', search.Operator.IS, 'T']
                            , 'and',
                            ['taxline', search.Operator.IS, 'F']
                        ]

                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'custbody_ref_banc'}),
                        search.createColumn({name: 'entity'}),
                        search.createColumn({name: 'location'}),
                        search.createColumn({name: 'custbody_efx_fe_entity_timbra'}),
                        search.createColumn({name: 'custbody_efx_fe_formapago'}),
                        search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
                        search.createColumn({name: 'custbody_efx_fe_metodopago'}),
                        search.createColumn({name: 'custbody_efx_fe_uuid'}),
                        search.createColumn({name: 'custbody_efx_fe_pdf_file_ns'}),
                        search.createColumn({name: 'custbody_efx_fe_xml_file_ns'}),
                        search.createColumn({name: 'custbody_efx_fe_num_parcialidad'}),
                        search.createColumn({name: 'amountremaining'}),
                    ]
                });

                log.audit({title: 'busqueda_facturas', details: busqueda_facturas});
                return busqueda_facturas;
            }else{
                var busqueda_facturas = search.create({
                    type: search.Type.INVOICE,
                    filters: [
                        [[['custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                            , 'and',
                            ['custbody_efx_fe_pdf_file_ns', search.Operator.ISEMPTY, '']
                            , 'and',
                            ['custbody_efx_fe_xml_file_ns', search.Operator.ISEMPTY, '']]
                            , 'or',
                            ['status', search.Operator.ANYOF, 'CustInvc:A', 'CustInvc:B']]
                        , 'and',
                        ['mainline', search.Operator.IS, 'T']
                        , 'and',
                        ['taxline', search.Operator.IS, 'F']
                        , 'and',
                        ['internalid', search.Operator.ANYOF, idRegistro]
                        // ,'and',
                        // ['trandate',search.Operator.ONORBEFORE,'tendaysago']
                    ],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'custbody_ref_banc'}),
                        search.createColumn({name: 'entity'}),
                        search.createColumn({name: 'location'}),
                        search.createColumn({name: 'custbody_efx_fe_entity_timbra'}),
                        search.createColumn({name: 'custbody_efx_fe_formapago'}),
                        search.createColumn({name: 'custbody_efx_fe_usocfdi'}),
                        search.createColumn({name: 'custbody_efx_fe_metodopago'}),
                        search.createColumn({name: 'custbody_efx_fe_uuid'}),
                        search.createColumn({name: 'custbody_efx_fe_pdf_file_ns'}),
                        search.createColumn({name: 'custbody_efx_fe_xml_file_ns'}),
                        search.createColumn({name: 'amountremaining'}),
                        search.createColumn({name: 'custbody_efx_fe_num_parcialidad'}),
                    ]
                });
            }
        }catch(error_busqueda){
            log.audit({title: 'error_busqueda', details: error_busqueda});
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



        var attachments_record = new Array();
        var cfdi_record = record.load({
            type: record.Type.INVOICE,
            id: id,
            isDynamic: true
        });

        var linecount_item = cfdi_record.getLineCount({
            sublistId: 'item'
        });

        var uuid = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_uuid',
        });

        var parcialidad = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_num_parcialidad',
        });

        var pdf = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_pdf_file_ns',
        });

        var xml = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_xml_file_ns',
        });

        var amount_remaining = cfdi_record.getValue({
            fieldId: 'amountremaining',
        });

        var global = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_factura_global',
        });

        var global_pdf_id = cfdi_record.getValue({
            fieldId: 'custbody_efx_fe_factura_global',
        });

        var cliente = cfdi_record.getValue({
            fieldId: 'entity',
        });

        for(var li=0;li<linecount_item;li++){
            var articulo_factura = cfdi_record.getSublistValue({
                sublistId: 'item',
                fieldId: 'item',
                line: li
            });
        }


        var linecount = cfdi_record.getLineCount({
            sublistId: 'links'
        });

        log.audit({title: 'amount_remaining', details: amount_remaining});
        log.audit({title: 'parcialidad', details: parcialidad});
        log.audit({title: 'id', details: id});
        log.audit({title: 'global_pdf_id', details: global_pdf_id});

        try {
            if ((!uuid && !global && (!pdf || !xml)) || amount_remaining>0 || parcialidad>1) {
                if (articulo_recargo != articulo_factura) {
                    if(!uuid) {
                        try {
                            var SLURL = '';

                            SLURL = urlMod.resolveScript({
                                scriptId: 'customscript_efx_fe_cfdi_sl',
                                deploymentId: 'customdeploy_efx_fe_cfdi_sl',
                                returnExternalUrl: true,
                                params: {
                                    custparam_tranid: id,
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
                            }
                        } catch (error_timbrado) {
                            log.audit({title: 'error_timbrado', details: error_timbrado});
                        }
                    }
                }else{
                    try {
                        var global = '';
                        var global_un = '';
                        var facturas_parciales = new Array();
                        var fac_recargos = buscarFacturasRecargo(articulo_recargo, cliente,id);
                        log.audit({title: 'fac_recargos', details: fac_recargos});
                        if(fac_recargos.length>1){
                            global = timbrarRecargos(cfdi_record, fac_recargos, cliente);
                            for(var frec=0;frec<fac_recargos.length;frec++){
                                if(fac_recargos[frec].fac_amountremaining>0){
                                    if(fac_recargos[frec].fac_monto!=fac_recargos[frec].fac_amountremaining){
                                        //buscarpagos de esa factura y timbrarlos
                                        //o guardar las facturas en un array y en una sola funcion buscar pago y timbrar
                                        facturas_parciales.push(fac_recargos[frec].fac_internalid);
                                    }
                                }
                            }
                        }else{
                            if(fac_recargos.length==1){
                                global_un = unRecargo(fac_recargos[0].fac_internalid);
                                if(fac_recargos[0].fac_amountremaining>0){
                                    if(fac_recargos[0].fac_monto!=fac_recargos[0].fac_amountremaining){
                                        //buscarpagos de esa factura y timbrarlos
                                        //o guardar las facturas en un array y en una sola funcion buscar pago y timbrar
                                        facturas_parciales.push(fac_recargos[0].fac_internalid);
                                    }
                                }
                            }
                        }

                        if(facturas_parciales.length>0){

                            var parcial_payments = BuscarPagoParcial(facturas_parciales);
                            log.audit({title: 'parcial_payments', details: parcial_payments});
                            for(var pp=0;pp<parcial_payments.length;pp++){
                                var timbre_parcialpayment = timbrarPagos(parcial_payments[pp]);
                            }
                            var pdf_global = unirDocs_globales(global,global_un,parcial_payments);
                            if(pdf_global){
                                attachments_record.push(pdf_global);
                            }
                        }else{
                            var factura_sola = new Array();
                            factura_sola.push(id);
                            var pago_p_r = BuscarPagoParcial(factura_sola);
                            log.audit({title: 'pago_p_r', details: pago_p_r});
                            for(var pp=0;pp<pago_p_r.length;pp++){
                                var timbre_parcialpayment = timbrarPagos(pago_p_r[pp]);
                            }
                            var pdf_global = unirDocs_globales(global_pdf_id,global_un,pago_p_r,id);
                            if(pdf_global){
                                attachments_record.push(pdf_global);
                            }
                        }



                    }catch(error_recargos_timbre){
                        log.audit({title: 'error_recargos_timbre', details: error_recargos_timbre});
                    }
                }
            }
        }catch(error_facturas){
            log.audit({title: 'error_facturas', details: error_facturas});
        }

        try {

            var array_pagos = new Array();

            for (var lc = 0; lc < linecount; lc++) {

                var tipo = cfdi_record.getSublistValue({
                    sublistId: 'links',
                    fieldId: 'type',
                    line: lc
                });

                if (tipo == 'Payment' || tipo == 'Pago') {
                    var pagos_factura = cfdi_record.getSublistValue({
                        sublistId: 'links',
                        fieldId: 'id',
                        line: lc
                    });
                    array_pagos.push(pagos_factura);
                }
            }
            log.audit({title: 'array_pagos', details: array_pagos});

            var datos_pagos = buscarPagos(array_pagos);

            var xml_payments = '';
            for (var t = 0; t < datos_pagos.length; t++) {
                log.audit({title: 'articulo_recargo', details: articulo_recargo});
                log.audit({title: 'articulo_factura', details: articulo_factura});
                if(articulo_recargo!=articulo_factura) {
                    var timbre_pago = timbrarPagos(datos_pagos[t].fac_internalid);

                    log.audit({title: 'timbre_pago', details: timbre_pago});

                    var cfdi_record_pay = record.load({
                        type: record.Type.CUSTOMER_PAYMENT,
                        id: datos_pagos[t].fac_internalid,
                        isDynamic: true
                    });
                    var pdf_pay = cfdi_record_pay.getValue({
                        fieldId: 'custbody_efx_fe_pdf_file_ns',
                    });

                    if(pdf_pay){
                        var pdf_pay_escape = xmls.escape({
                            xmlText: pdf_pay
                        });

                        log.audit({title: 'pdf_pay', details: pdf_pay});
                        xml_payments += '<pdf src="https://system.netsuite.com' + pdf_pay_escape + '"></pdf>'
                    }

                }
            }

            if(articulo_recargo!=articulo_factura) {
            if(!pdf){
                var cfdi_record_pdf = record.load({
                    type: record.Type.INVOICE,
                    id: id,
                    isDynamic: true
                });

                pdf = cfdi_record_pdf.getValue({
                    fieldId: 'custbody_efx_fe_pdf_file_ns',
                });
            }

            log.audit({title: 'pdf', details: pdf});

            try {

                var xml_concat = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
                xml_concat += "<pdfset>"
                // xml_concat += "<pdf>\n<body font-size=\"12\">\n<h2>Merged PDF</h2>\n"
                // xml_concat += "<p></p>"
                // xml_concat += "Document body"
                // xml_concat += "</body>\n</pdf>"

                var pdf_escape = xmls.escape({
                    xmlText : pdf
                });


                // var pdf1 = pdf.replace(/&/gi,'&amp;');
                // var pdf2 = pdf_pay.replace(/&/gi,'&amp;');

                xml_concat += '<pdf src="https://system.netsuite.com' + pdf_escape + '"></pdf>'
                // xml_concat += '<pdf src="' + pdf_escape + '" />';

                xml_concat += xml_payments
                // xml_concat += '<pdf src="https://system.netsuite.com' + pdf_pay_escape + '"></pdf>'
                // xml_concat += '<pdf src="' + pdf_pay_escape + '" />';

                xml_concat += "</pdfset>"

                log.audit({title: 'xml_concat', details: xml_concat});

                // var xml_concat_escape = xmls.escape({
                //     xmlText : xml_concat
                // });
                //
                // log.audit({title: 'xml_concat_escape', details: xml_concat_escape});

                var xmlDocument = xmls.Parser.fromString({
                    text : xml_concat
                });

                var pdfFile = render.xmlToPdf({
                    xmlString: xmlDocument
                });
                log.audit({title: 'pdfFile', details: pdfFile});

                var scriptObj = runtime.getCurrentScript();
                var idFolder_pdf = scriptObj.getParameter({name: 'custscript_efx_db_pdfpagofactura'});

                pdfFile.name = 'Factura_Pago_'+id+'.pdf';
                pdfFile.folder = idFolder_pdf;
                idpdfconcate=pdfFile.save();
                log.audit({title: 'idpdfconcate', details: idpdfconcate});


                if(idpdfconcate){
                    for (var t = 0; t < datos_pagos.length; t++) {

                        var cfdi_record_pay = record.load({
                            type: record.Type.CUSTOMER_PAYMENT,
                            id: datos_pagos[t].fac_internalid,
                            isDynamic: true
                        });
                        cfdi_record_pay.setValue({
                            fieldId: 'custbody_efx_db_gralpdf',
                            value: idpdfconcate,
                            ignoreFieldChange: true
                        });
                        cfdi_record_pay.save({
                            enableSourcing: true,
                            ignoreMandatoryFields: true
                        });
                    }
                    attachments_record.push(idpdfconcate);
                }

            }catch(error_concatenar){
                log.audit({title: 'error_concatenar', details: error_concatenar});
            }

            }

        }catch (error_pagos) {
            log.audit({title: 'error_pagos', details: error_pagos});

        }

        if(attachments_record.length>0){

            var mailData = createMail(attachments_record,cliente);
            log.audit({ title: "mailData: ", details: mailData });
            context.write({
                key: id,
                value: mailData
            });

        }


    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(context) {

        log.audit({title: 'context_sumarize', details: context});

        context.output.iterator().each(function(key, value) {
            log.audit({title: 'key', details: key});
            log.audit({title: 'value', details: value});
            var datos_mail = JSON.parse(value);
            log.audit({title: 'datos_mail', details: datos_mail});
            log.audit({title: 'datos_mail.recipients', details: datos_mail.recipients});
            log.audit({title: 'datos_mail.recipients.length', details: datos_mail.recipients.length});

            if(datos_mail.attachmentPdf.length>0){
                var pdffile1 = new Array();
                for(var t=0;t<datos_mail.attachmentPdf.length;t++){
                    pdffile1[t] = file.load({id:datos_mail.attachmentPdf[t]});
                }



                if(datos_mail){
                    if (datos_mail.recipients.length > 0) {
                        email.send({
                            // author: userObj.id,
                            author: datos_mail.author,
                            recipients: datos_mail.recipients,
                            subject: datos_mail.subject,
                            body: datos_mail.body,
                            attachments: pdffile1
                        });
                    }
                    log.audit({title: 'correo', details: 'enviado'});
                }

            }


            return true;
        });
    }

    function timbrarPagos(id_pagos) {

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
                    custparam_tranid: id_pagos,
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
            }
        }catch(error_timbre_pago){
            log.audit({title: 'error_timbre_pago', details: error_timbre_pago});
        }

        return responseBody;

            }

    function buscarPagos(pagosId) {

        // var filtro_pagos = new Array();
        // var fc = 0;
        // for (var x = 0; x < pagosId.length; x++) {
        //     fc++;
        //     filtro_pagos.push(['internalid', search.Operator.IS, pagosId[x]]);
        //     if (fc < pagosId.length) {
        //         filtro_pagos.push('OR');
        //     }
        // }


        var busqueda_pagos = search.create({
            type: search.Type.CUSTOMER_PAYMENT,
            filters: [
                 ['internalid', search.Operator.ANYOF, pagosId]
                 , 'and',
                ['mainline', search.Operator.IS, 'T']
                ,'and',
                ['custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_pdf_file_ns', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_xml_file_ns', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_metodopago', search.Operator.IS, 2]
            ],
            columns: [
                search.createColumn({name: 'internalid'}),
            ]
        });

        var ejecutar_pagos = busqueda_pagos.run();

        var resultado_pagos = ejecutar_pagos.getRange(0, 100);


        var pagos_ids = [];
        for (var i = 0; i < resultado_pagos.length; i++) {
            var fac_internalid = resultado_pagos[i].getValue({name: 'internalid'}) || '';


            pagos_ids.push({
                fac_internalid: fac_internalid,
            });
        }

        return pagos_ids;
    }

    function buscarFacturasRecargo(articulo_recargo,cliente,id_fac_rec) {

        var busqueda_recargo = search.create({
            type: search.Type.INVOICE,
            filters: [
                // ['custbody_efx_fe_factura_global', search.Operator.ANYOF, '@NONE@']
                // , 'and',
                ['custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                , 'and',
                // ['custbody_efx_fe_num_parcialidad', search.Operator.GREATERTHAN, 1]
                // ,'and',
                // ['internalid', search.Operator.IS, id_fac_rec]
                // ,'and',
                ['status', search.Operator.ANYOF, 'CustInvc:B','CustInvc:A']
                , 'and',
                ['mainline', search.Operator.IS, 'F']
                , 'and',
                ['taxline', search.Operator.IS, 'F']
                , 'and',
                ['name', search.Operator.IS, cliente],
                'and',
                ['item', search.Operator.IS, articulo_recargo]
            ],
            columns: [
                search.createColumn({name: 'internalid'}),
                search.createColumn({name: 'total'}),
                search.createColumn({name: 'taxtotal'}),
                search.createColumn({name: 'tranid'}),
                search.createColumn({name: 'custcol_efx_fe_tasa_cuota'}),
                search.createColumn({name: 'custcol_efx_fe_tipo_impuesto'}),
                search.createColumn({name: 'custcol_efx_fe_tipo_factor'}),
                search.createColumn({name: 'custcol_efx_fe_unidad_medida_sat'}),
                search.createColumn({name: 'custcol_efx_fe_clave_producto_sat'}),
                search.createColumn({name: 'amountremaining'}),
            ]
        });
        var ejecutar_recargo = busqueda_recargo.run();
        log.audit({title: 'ejecutar_recargo', details: ejecutar_recargo});
        var resultado_recargo = ejecutar_recargo.getRange(0, 100);
        log.audit({title: 'resultado_recargo', details: resultado_recargo});

        var recargos_array = [];
        var ids_recargos = [];
        for (var i = 0; i < resultado_recargo.length; i++) {
            ids_recargos[i]=resultado_recargo[i].getValue({name: 'internalid'}) || '';
            var fac_internalid = resultado_recargo[i].getValue({name: 'internalid'}) || '';
            var fac_monto = resultado_recargo[i].getValue({name: 'total'}) || '';
            var fac_tax = resultado_recargo[i].getValue({name: 'taxtotal'}) || '';
            var fac_tranid = resultado_recargo[i].getValue({name: 'tranid'}) || '';
            var fac_tasaocuota = resultado_recargo[i].getValue({name: 'custcol_efx_fe_tasa_cuota'}) || '';
            var fac_tipoimpuesto = resultado_recargo[i].getValue({name: 'custcol_efx_fe_tipo_impuesto'}) || '';
            var fac_tipofactor = resultado_recargo[i].getValue({name: 'custcol_efx_fe_tipo_factor'}) || '';
            var fac_unidadm = resultado_recargo[i].getValue({name: 'custcol_efx_fe_unidad_medida_sat'}) || '';
            var fac_claveprod = resultado_recargo[i].getValue({name: 'custcol_efx_fe_clave_producto_sat'}) || '';
            var fac_amountremaining = resultado_recargo[i].getValue({name: 'amountremaining'});

            recargos_array.push({
                fac_internalid: fac_internalid,
                fac_monto:fac_monto,
                fac_tax:fac_tax,
                fac_tranid:fac_tranid,
                fac_tasaocuota:fac_tasaocuota,
                fac_tipoimpuesto:fac_tipoimpuesto,
                fac_tipofactor:fac_tipofactor,
                fac_unidadm:fac_unidadm,
                fac_claveprod:fac_claveprod,
                fac_amountremaining:fac_amountremaining

            });
        }

        if(ids_recargos.length>0){
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
                recargos_array[x].fac_amountremaining= resultado_recargo_rest[x].getValue({name: 'amountremaining'});
            }

        }




        return recargos_array;
    }

    function timbrarRecargos(cfdi_record,fac_recargos,cliente) {
        try {
            var procces = false;

            var monto_facturas = 0;
            for(var i=0;i<fac_recargos.length;i++){
                monto_facturas = monto_facturas+parseFloat(fac_recargos[i].fac_monto);
            }

            log.audit({title: 'monto_facturas', details: monto_facturas});


            //Buscar cliente
            var cliente_obj = armar_direccion(cliente);

            log.audit({title: 'cliente_obj', details: cliente_obj});

            var selected = false;
            var arrayInvoiceSelect = [];

            var modeGlb = 2;

            var typeGlb = 'invoice';

            var client_receptor = cliente;

            var lugar_expedicion = cliente_obj.address.custparam_lugar_expedicion;

            log.audit({title: 'lugar_expedicion', details: lugar_expedicion});

            var client_select = cliente;

            var rfc = cliente_obj.custparam_rfc || '';

            var moneda = cliente_obj.custparam_currency || '';

            var total = monto_facturas || '';

            var varmemo = 'Facturas de Recargo del cliente.';

            log.audit({title: 'varmemo', details: varmemo});

            var contact_email = cliente_obj.custparam_contact_email;

            log.audit({title: 'contact_email', details: contact_email});

            var metodopago = cfdi_record.getValue({
                fieldId: 'custbody_efx_fe_metodopago',
            });

            var formapago = cfdi_record.getValue({
                fieldId: 'custbody_efx_fe_formapago',
            });

            var usocfdi = cfdi_record.getValue({
                fieldId: 'custbody_efx_fe_usocfdi',
            });


            log.audit({title: 'lugar_expedicion', details: lugar_expedicion});
            log.audit({title: 'modeGlb', details: modeGlb});
            var errorList = [];
            var objTable = {};

            switch (modeGlb * 1) {
                // fac_internalid
                // fac_monto
                //fac_tax
                //fac_tranid
                case 2: {
                    log.audit({title: 'modeGlb', details: modeGlb});
                    for (var a = 0; a < fac_recargos.length; a++) {
                            selected = true;
                            var id_facrec = fac_recargos[a].fac_internalid;
                        log.audit({title: 'id_facrec', details: id_facrec});
                            if (id_facrec) {
                                arrayInvoiceSelect.push(id_facrec);
                                log.audit({title: 'arrayInvoiceSelect', details: arrayInvoiceSelect});

                                    var monto = parseFloat(fac_recargos[a].fac_monto) * 1 || 0;

                                    var impuesto = fac_recargos[a].fac_tax * 1 || 0;//  label: 'Impuesto',

                                    var item_name = 'Factura: '+fac_recargos[a].fac_tranid || ''; //   label: 'Nombre',

                                    var item_impuesto = fac_recargos[a].fac_tasaocuota || ''; //           label: 'Tasa o Cuota',

                                    var tipo_impuesto_cod = fac_recargos[a].fac_tipoimpuesto;
                                    var tipo_impuesto = '';

                                    if(tipo_impuesto_cod=='ISR'){
                                        tipo_impuesto = '001';
                                    }
                                    if(tipo_impuesto_cod=='IVA'){
                                        tipo_impuesto = '002';
                                    }
                                    if(tipo_impuesto_cod=='IEPS'){
                                        tipo_impuesto = '003';
                                    }

                                    var item_impuesto_codigo = tipo_impuesto || ''; //    label: 'Impuesto',

                                    var item_tipo_factor = fac_recargos[a].fac_tipofactor || ''; //        label: 'Tipo Factor',

                                    var item_unidad_text =  'Actividad'; //        label: 'Nombre Unidad De Medida',

                                    var item_unidad = 'ACT' || ''; //             label: 'Clave Unidad De Medida',

                                    var item_producto = fac_recargos[a].fac_claveprod || ''; //           label: 'Clave de Producto / Servicio',

                                    var item_descripcion = 'Venta por Monto Total: '+monto || ''; //        label: 'Descripción',

                                    if (!monto || monto * 1 == 0) {
                                        errorList.push('Valor no valido en el campo Total');
                                    }
                                    // if (impuesto<0) {
                                    //     errorList.push('Valor no valido en el campo Impuesto');
                                    // }
                                    if (!item_name) {
                                        errorList.push('Valor no valido en el campo nombre');
                                    }
                                    // if (!item_impuesto) {
                                    //     errorList.push('Valor no valido en el campo item_impuesto');
                                    // }
                                    // if (!item_impuesto_codigo) {
                                    //     errorList.push('Valor no valido en el campo item_impuesto_codigo');
                                    // }
                                    // if (!item_tipo_factor) {
                                    //     errorList.push('Valor no valido en el campo item_tipo_factor');
                                    // }

                                    if (!item_unidad) {
                                        errorList.push('Valor no valido en el campo item_unidad');
                                    }
                                    if (!item_producto) {
                                        errorList.push('Valor no valido en el campo item_producto');
                                    }
                                    if (!item_descripcion) {
                                        errorList.push('Valor no valido en el campo item_descripcion');
                                    }

                                    objTable[a] = {
                                        id: id_facrec,
                                        monto: (monto * 1 || 0).toFixed(2),
                                        impuesto: (impuesto * 1 || 0).toFixed(2),
                                        item_name: item_name,
                                        item_impuesto: item_impuesto,
                                        item_impuesto_codigo: item_impuesto_codigo,
                                        item_tipo_factor: item_tipo_factor,
                                        item_unidad_text: item_unidad_text,
                                        item_unidad: item_unidad,
                                        item_producto: item_producto,
                                        item_descripcion: item_descripcion,
                                    }
                            }
                    }
                    log.audit({title: 'objTable', details: objTable});
                }
                    break;
                default:
                    errorList.push('Modo de Factura global incorrecto ' + modeGlb)
                    break;
            }

            if (lugar_expedicion == '') {
                errorList.push("Seleccione una Direccion.");
            }

            if (client_receptor == '') {
                errorList.push("Seleccione un cliente Receptor.");
            }

            if (!modeGlb) {
                errorList.push("Seleccione una TIPO DE FACTURA.");
            }

            if (!selected) {
                errorList.push("Seleccione una factura para procesar.");
            }


            log.audit({title: 'errorList.length', details: errorList.length});
            var mesaggeError = '';
            for (var m = 0; m < errorList.length; m++) {
                mesaggeError += errorList[m] + '/n';
            }

            log.audit({title: 'mesaggeError', details: mesaggeError});
            if (mesaggeError) {
                return false;
            }

            log.audit({title: 'procces', details: procces});
            if (!procces) {
                procces = true;
                var data = {
                    custparam_mode_glb: modeGlb,
                    custparam_type: typeGlb,
                    custparam_mode: 'proces_new',
                    custparam_lugar_expedicion: lugar_expedicion,
                    custparam_client_receptor: client_receptor,
                    custparam_client: client_select,
                    custparam_memo: varmemo,
                    // custparam_startdate: startdate,
                    // custparam_enddate: enddate,
                    custparam_rfc: rfc,
                    custparam_currency: moneda,
                    custparam_total: total,
                    //custpage_contact_email_text: contact_emailText,
                    custparam_contact_email: contact_email,
                    custparam_metodopago: metodopago,
                    custparam_formapago: formapago,
                    custparam_usocfdi: usocfdi,
                    custparam_invoice: arrayInvoiceSelect,
                    dataLine: JSON.stringify(objTable)
                };
                log.audit({title: 'data', details: data});
                var recFacglobal = crearFacturaGlobal(data);
                log.audit({title: 'recFacglobal', details: recFacglobal});
                // var objCreate = postFunction('proces_new', data);
                // log.audit({title: 'objCreate', details: objCreate});

                if(recFacglobal){
                    for (var is = 0; is < data.custparam_invoice.length; is++) {
                        try {
                            record.submitFields({
                                type: record.Type.INVOICE,
                                id: data.custparam_invoice[is],
                                values: {
                                    'custbody_efx_fe_factura_global': recFacglobal
                                },
                                options: {
                                    enableSourcing: false,
                                    ignoreMandatoryFields: true
                                }
                            });
                        } catch (error) {
                            log.audit({ title: 'error', details: JSON.stringify(error) });
                        }
                    }
                    try{
                        var lineas_Global = crearLineasDoc(recFacglobal,data);
                        var SLURL = '';

                        SLURL = urlMod.resolveScript({
                            scriptId: 'customscript_efx_fe_cfdi_sl',
                            deploymentId: 'customdeploy_efx_fe_cfdi_sl',
                            returnExternalUrl: true,
                            params: {
                                custparam_glb: recFacglobal,
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
                        }
                        }catch(error_timbraGlobal){
                        log.audit({title: 'error_timbraGlobal', details: JSON.stringify(error_timbraGlobal)});
                    }
                }

            } else {

                // var url_Script = urlMod.resolveScript({
                //     scriptId: 'customscript_efx_fe_cdfi_fac_global_sl',
                //     deploymentId: 'customdeploy_efx_fe_cdfi_fac_global_sl'
                // });
                //window.open(url_Script, '_self');
            }

        } catch (pageInitError) {

        }






        return recFacglobal;
    }

    function postFunction(mode, objData) {
        log.audit({title: 'mode', details: JSON.stringify(mode)});
        log.audit({title: 'objData', details: JSON.stringify(objData)});
        var respuesta = '';

        try {
            var scheme = 'https://';

            var host = urlMod.resolveDomain({
                hostType: urlMod.HostType.APPLICATION
            });

            var SLURL = urlMod.resolveScript({
                scriptId: 'customscript_efx_fe_cdfi_fac_global_sl',
                deploymentId: 'customdeploy_efx_fe_cdfi_fac_global_sl',
                returnExternalUrl: false
            });

            log.audit({title: 'SLURL', details: JSON.stringify(SLURL)});

            if (SLURL) {
                var parametroSl = '';

                var newUrlPost = scheme + host + SLURL + parametroSl;

                var headers = {
                    'Content-Type': 'application/json'
                };

                var objBodyText = {
                    custparam_mode: mode,
                    custparam_bancos:'bancos',
                    custparam_data: JSON.stringify(objData)
                };

                objBodyText = JSON.stringify(objBodyText);

                var responseSL = https.request({
                    headers: headers,
                    method: https.Method.GET,
                    url: newUrlPost,
                    body: objBodyText
                });

                log.audit({title: 'responseSL', details: responseSL});


                var code = responseSL.code;
                var body = responseSL.body;

                log.audit({title: 'code', details: code});
                log.audit({title: 'body', details: body});

                if (code == 200) {
                    log.audit({title: 'entro a 200', details: ''});
                    respuesta = JSON.parse(body);
                    log.audit({title: 'respuesta', details: respuesta});
                    respuesta = respuesta.data;
                    log.audit({title: 'respuesta', details: respuesta});
                } else {
                    respuesta = false;
                }
            }
        } catch (error) {
            // console.log({ title: 'error', details: error });
            respuesta = false;
        }
        // console.log({ title: 'respuesta', details: respuesta });
        // console.log(respuesta);
        return respuesta;
    }

    function armar_direccion(cliente) {

        var objCustomer = {
            custparam_rfc: '',
            custparam_currency: '',
            custparam_contact_email: [],
            custparam_metodopago: '',
            custparam_formapago: '',
            custparam_usocfdi: '',
            address: {}
        };

        var result_cliente = search.create({
            type: search.Type.CUSTOMER,
            filters: [
                [
                    'isinactive', search.Operator.IS, 'F'
                ],
                'and',
                [
                    'internalid', search.Operator.IS, cliente
                ]
            ],
            columns: [
                {
                    name: 'vatregnumber'
                }, {
                    name: 'currency'
                }, {
                    name: 'custentity_efx_fe_contact_email'
                }, {
                    name: 'custentity_efx_fe_metodopago'
                }, {
                    name: 'custentity_efx_fe_formapago'
                }, {
                    name: 'custentity_efx_fe_usocfdi'
                }, {
                    join: 'address',
                    name: 'addressinternalid'
                }, {
                    join: 'address',
                    name: 'address'
                }, {
                    join: 'address',
                    name: 'address1'
                }, {
                    join: 'address',
                    name: 'zipcode'
                }, {
                    join: 'address',
                    name: 'addressee'
                }
            ]
        });

        var resultData = result_cliente.run();
        log.audit({title: 'resultData', details: resultData});
        var start = 0;
        do {
            var resultSet = resultData.getRange(start, start + 1000);
            if (resultSet && resultSet.length > 0) {
                for (var i = 0; i < resultSet.length; i++) {
                    var id = resultSet[i].id;
                    var rfc = resultSet[i].getValue({ name: 'vatregnumber' });
                    var moneda = resultSet[i].getValue({ name: 'currency' });
                    var monedaText = resultSet[i].getText({ name: 'currency' });
                    var email = resultSet[i].getValue({ name: 'custentity_efx_fe_contact_email' }) || '';
                    var metodoPago = resultSet[i].getValue({ name: 'custentity_efx_fe_metodopago' });
                    var formaPago = resultSet[i].getValue({ name: 'custentity_efx_fe_formapago' });
                    var usoCfdi = resultSet[i].getValue({ name: 'custentity_efx_fe_usocfdi' });
                    var addressId = resultSet[i].getValue(
                        { join: 'address', name: 'addressinternalid' }
                    );
                    var address = resultSet[i].getValue({ join: 'address', name: 'address' });
                    var address1 = resultSet[i].getValue({ join: 'address', name: 'address1' });
                    var zipcode = resultSet[i].getValue({ join: 'address', name: 'zipcode' });
                    var addressee = resultSet[i].getValue({ join: 'address', name: 'addressee' });

                    objCustomer.id = id;
                    objCustomer.custparam_rfc = rfc;
                    objCustomer.custparam_currency = moneda;
                    objCustomer.custparam_currencyText = monedaText;
                    objCustomer.custparam_contact_email = [];
                    if (email) {
                        objCustomer.custparam_contact_email = email.split(',');
                    }
                    objCustomer.custparam_metodopago = metodoPago;
                    objCustomer.custparam_formapago = formaPago;
                    objCustomer.custparam_usocfdi = usoCfdi;

                    objCustomer.address = {
                        custparam_lugar_expedicion: addressId,
                        text: address,
                        name: address1,
                        addressee: addressee,
                        zipcode: zipcode
                    };
                }
            }
            start += 1000;
        } while (resultSet && resultSet.length == 1000);

        log.audit({title: 'objCustomer', details: objCustomer});

        return objCustomer;

    }

    function crearFacturaGlobal(data) {
        var scriptObj = runtime.getCurrentScript();
        var folioGlobal = scriptObj.getParameter({ name: 'custscript_efx_fe_folio_global' }) || '';
        var objParam = {
            custparam_lugar_expedicion: data.custparam_lugar_expedicion,
            custparam_memo: data.custparam_memo,
            custparam_rfc: data.custparam_rfc,
            custparam_currency: data.custparam_currency,
            custparam_contact_email: data.custparam_contact_email,
            custparam_metodopago: data.custparam_metodopago,
            custparam_formapago: data.custparam_formapago,
            custparam_usocfdi: data.custparam_usocfdi,
            //custparam_total_monto: data,
            //custpage_contact_email_text: data,
            custparam_mode_glb: data.custparam_mode_glb,
            custparam_client: data.custparam_client,
            // custparam_startdate: data,
            // custparam_enddate: data,
            custparam_total: data.custparam_total,
            custparam_invoice: data.custparam_invoice,
            //trandate: data,
            idGlobal: 0,
            folio: folioGlobal,
            custparam_type: data.custparam_type
        };

        var objReturn = 0;
        try {
            log.audit({ title: 'objParam', details: JSON.stringify(objParam) });

            var rec = record.create({ type: 'customrecord_efx_fe_factura_global' });

            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_rfc', value: objParam.custparam_rfc }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_lugar_expedicion', value: objParam.custparam_lugar_expedicion }
            );

            var fechaRegistro = new Date();
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_fecha_registro', value: fechaRegistro }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_customer', value: objParam.custparam_client }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_currency', value: objParam.custparam_currency }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_forma_pago', value: objParam.custparam_formapago }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_metodo_pago', value: objParam.custparam_metodopago }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_uso_cfdi', value: objParam.custparam_usocfdi }
            );

            if (objParam.custparam_contact_email && objParam.custparam_contact_email.length > 0) {
                rec.setValue(
                    { fieldId: 'custrecord_efx_fe_fg_correo', value: objParam.custparam_contact_email }
                );
            }
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_fg_total', value: objParam.custparam_total }
            );
            if (objParam.custparam_memo) {
                rec.setValue(
                    { fieldId: 'custrecord_efx_fe_fg_memo', value: objParam.custparam_memo }
                );
            }
            log.emergency({
                title: '(objParam.custparam_invoice',
                details: JSON.stringify((objParam.custparam_invoice))
            });
            if (objParam.custparam_invoice.length < 200) {
                rec.setValue(
                    { fieldId: 'custrecord_efx_fe_fg_ms_transaction', value: objParam.custparam_invoice }
                );
            } else {
                var firstElement = [objParam.custparam_invoice[0]];
                rec.setValue(
                    { fieldId: 'custrecord_efx_fe_fg_ms_transaction', value: firstElement }
                );

                /*rec.setValue({
                    fieldId: 'custrecord_efx_fe_fg_array_tran',
                    value: JSON.stringify(objParam.custparam_invoice)
                });

                var idCSV = '';

                log.audit({ title: 'idCSV', details: JSON.stringify(idCSV) });
                if (idCSV) {
                    rec.setValue({ fieldId: 'custrecord_efx_fe_fg_csv_update', value: idCSV });
                }*/
            }
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_glb_modo', value: objParam.custparam_mode_glb }
            );
            rec.setValue(
                { fieldId: 'custrecord_efx_fe_glb_tipo', value: objParam.custparam_type }
            );

            /*   rec.setValue({
                  fieldId: 'custrecord_efx_fe_fg_arreglo_factura',
                  value: JSON.stringify(objParam.custparam_invoice)
              }); */

            var recId = rec.save({ enableSourcing: true, ignoreMandatoryFields: true });
            objReturn = recId;

        } catch (createRecortFacturaGlobalError) {
            log.error(
                { title: 'createRecortFacturaGlobalError', details: createRecortFacturaGlobalError.message }
            );
        }
        log.audit(
            { title: 'objReturn createRecortFacturaGlobal', details: JSON.stringify(objReturn) }
        );
        return objReturn;


    }
    function crearLineasDoc(idGlobal,data) {
        var scriptObj = runtime.getCurrentScript();
        var folderGlobal = scriptObj.getParameter({ name: 'custscript_efx_fe_id_folder_global' }) || '';

        if (idGlobal > 0) {
                try {
                    var nameFileLine = 'line' + idGlobal + '.JSON';
                    var fileObj = file.create(
                        { name: nameFileLine, fileType: file.Type.JSON, contents: data.dataLine, encoding: file.Encoding.UTF8, folder: folderGlobal }
                    );

                    var fileId = fileObj.save() || '';
                    if (fileId) {
                        log.audit({title: 'Se guardo lineas de articulo en un archivo: ', details: nameFileLine});

                    } else {
                        log.audit({title: 'No se pudo guardo lineas de articulo en un archivo ', details: ''});

                    }
                    var idFileArrayIdTran='';

                    log.audit({title:'data.custparam_invoice.length',details:data.custparam_invoice.length});
                    if(data.custparam_invoice.length>199){
                        var text_array=JSON.stringify(data.custparam_invoice);
                        log.audit({title:'text_array',details:text_array});
                        var file_obj_array = file.create({
                            name: nameFileLine+'_array_id.json',
                            fileType: file.Type.JSON,
                            contents: text_array,
                            encoding: file.Encoding.UTF8,
                            folder: folderGlobal
                        });
                        idFileArrayIdTran= file_obj_array.save() || '';
                    }
                    log.audit({title:'idFileArrayIdTran',details:idFileArrayIdTran});
                } catch (error) {
                    log.audit({title:'No se pudo guardo lineas de articulo en un archivo',details:JSON.stringify(error)});
                }
                try {
                    var folioGlobal = scriptObj.getParameter({ name: 'custscript_efx_fe_folio_global' }) || '';

                    var nameChange = folioGlobal + idGlobal;
                    var objUpdate={
                        'name': nameChange,
                        'custrecord_efx_fe_fg_lilne_glb': fileId
                    };
                    if(idFileArrayIdTran){
                        objUpdate.custrecord_efx_fe_fg_array_tran=idFileArrayIdTran;
                    }
                    log.audit({title:'objUpdate',details:JSON.stringify(objUpdate)})
                    var nameRecord = record.submitFields({
                        type: 'CUSTOMRECORD_EFX_FE_FACTURA_GLOBAL',
                        id: idGlobal,
                        values: objUpdate
                    });
                    log.audit({title:'nameRecord',details:JSON.stringify(nameRecord)});

                } catch (error) {
                    log.audit({title:'No se pudo guardo actualizar factura global ',details:JSON.stringify(error)});
                }
        } else {
            log.audit({title:'Por favor configurar EFX FE - Carpeta GLB ',details:folderGlobal});
        }
    }

    function unRecargo(factura){
        try {
            var SLURL = '';

            SLURL = urlMod.resolveScript({
                scriptId: 'customscript_efx_fe_cfdi_sl',
                deploymentId: 'customdeploy_efx_fe_cfdi_sl',
                returnExternalUrl: true,
                params: {
                    custparam_tranid: factura,
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
            }
        } catch (error_timbrado) {
            log.audit({title: 'error_timbrado', details: error_timbrado});
        }
        return factura;
    }

    function BuscarPagoParcial(facturas_parciales){
        var array_pagosParciales = new Array();

        for(var i=0;i<facturas_parciales.length;i++){

            var cfdi_record = record.load({
                type: record.Type.INVOICE,
                id: facturas_parciales[i],
                isDynamic: true
            });

            var linecount = cfdi_record.getLineCount({
                sublistId: 'links'
            });

            for (var lc = 0; lc < linecount; lc++) {

                var tipo = cfdi_record.getSublistValue({
                    sublistId: 'links',
                    fieldId: 'type',
                    line: lc
                });

                if (tipo == 'Payment' || tipo == 'Pago') {
                    var pagos_factura = cfdi_record.getSublistValue({
                        sublistId: 'links',
                        fieldId: 'id',
                        line: lc
                    });
                    array_pagosParciales.push(pagos_factura);
                }
            }
            log.audit({title: 'array_pagosParciales', details: array_pagosParciales});
        }


        var busqueda_pagos = search.create({
            type: search.Type.CUSTOMER_PAYMENT,
            filters: [
                ['internalid', search.Operator.ANYOF, array_pagosParciales]
                , 'and',
                ['mainline', search.Operator.IS, 'T']
                ,'and',
                ['custbody_efx_fe_uuid', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_pdf_file_ns', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_xml_file_ns', search.Operator.ISEMPTY, '']
                , 'and',
                ['custbody_efx_fe_metodopago', search.Operator.IS, 2]
            ],
            columns: [
                search.createColumn({name: 'internalid'}),
            ]
        });

        var ejecutar_pagos = busqueda_pagos.run();

        var resultado_pagos = ejecutar_pagos.getRange(0, 100);


        var pagos_ids_recargo = new Array();
        for (var i = 0; i < resultado_pagos.length; i++) {
            pagos_ids_recargo[i] = resultado_pagos[i].getValue({name: 'internalid'}) || '';
        }




        return pagos_ids_recargo;
    }

    function unirDocs_globales(global,global_un,parcial_payments,id_fact) {

        log.audit({title: 'global', details: global});
        var xml_payments='';
        var nombre_pago='';

        for(var pp=0;pp<parcial_payments.length;pp++){
            var cfdi_record_pay = record.load({
                type: record.Type.CUSTOMER_PAYMENT,
                id: parcial_payments[pp],
                isDynamic: true
            });
            nombre_pago = '_'+parcial_payments[pp];
            var pdf_pay = cfdi_record_pay.getValue({
                fieldId: 'custbody_efx_fe_pdf_file_ns',
            });

            var pdf_pay_escape = xmls.escape({
                xmlText: pdf_pay
            });

            log.audit({title: 'pdf_pay', details: pdf_pay});
            xml_payments += '<pdf src="https://system.netsuite.com' + pdf_pay_escape + '"></pdf>'
        }

        var id_factura_pago = '';

        if(global_un){
            var cfdi_record_pdf = record.load({
                type: record.Type.INVOICE,
                id: global_un,
                isDynamic: true
            });

            id_factura_pago = global_un;


            pdf = cfdi_record_pdf.getValue({
                fieldId: 'custbody_efx_fe_pdf_file_ns',
            });
        }

        if(global){
            id_factura_pago = global;
            var cfdi_record_pdf = record.load({
                type: 'customrecord_efx_fe_factura_global',
                id: global,
                isDynamic: true
            });

            pdf = cfdi_record_pdf.getValue({
                fieldId: 'custrecord_efx_fe_fg_pdf',
            });
        }

        log.audit({title: 'pdf', details: pdf});

        try {

            var xml_concat = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
            xml_concat += "<pdfset>"
            // xml_concat += "<pdf>\n<body font-size=\"12\">\n<h2>Merged PDF</h2>\n"
            // xml_concat += "<p></p>"
            // xml_concat += "Document body"
            // xml_concat += "</body>\n</pdf>"

            var pdf_escape = xmls.escape({
                xmlText : pdf
            });


            // var pdf1 = pdf.replace(/&/gi,'&amp;');
            // var pdf2 = pdf_pay.replace(/&/gi,'&amp;');

            xml_concat += '<pdf src="https://system.netsuite.com' + pdf_escape + '"></pdf>'
            // xml_concat += '<pdf src="' + pdf_escape + '" />';

            xml_concat += xml_payments
            // xml_concat += '<pdf src="https://system.netsuite.com' + pdf_pay_escape + '"></pdf>'
            // xml_concat += '<pdf src="' + pdf_pay_escape + '" />';

            xml_concat += "</pdfset>"

            log.audit({title: 'xml_concat', details: xml_concat});

            // var xml_concat_escape = xmls.escape({
            //     xmlText : xml_concat
            // });
            //
            // log.audit({title: 'xml_concat_escape', details: xml_concat_escape});

            var xmlDocument = xmls.Parser.fromString({
                text : xml_concat
            });

            var pdfFile = render.xmlToPdf({
                xmlString: xmlDocument
            });
            log.audit({title: 'pdfFile', details: pdfFile});

            var scriptObj = runtime.getCurrentScript();
            var idFolder_pdf = scriptObj.getParameter({name: 'custscript_efx_db_pdfpagofactura'});

            pdfFile.name = 'Factura_Pago_'+id_factura_pago+'_'+nombre_pago+'.pdf';
            pdfFile.folder = idFolder_pdf;
            idpdfconcate=pdfFile.save();
            log.audit({title: 'idpdfconcate', details: idpdfconcate});


            if(idpdfconcate){
                for (var t = 0; t < parcial_payments.length; t++) {

                    var cfdi_record_pay = record.load({
                        type: record.Type.CUSTOMER_PAYMENT,
                        id: parcial_payments[t],
                        isDynamic: true
                    });
                    cfdi_record_pay.setValue({
                        fieldId: 'custbody_efx_db_gralpdf',
                        value: idpdfconcate,
                        ignoreFieldChange: true
                    });
                    cfdi_record_pay.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
                }
            }




        }catch(error_concatenar){
            log.audit({title: 'error_concatenar', details: error_concatenar});
        }
        return idpdfconcate;
    }

    function createMail(attachments_record,cliente){

        log.audit({ title: "attachments_record: ", details: attachments_record });
        log.audit({ title: "cliente: ", details: cliente });

        var rec_cliente = record.load({
            type: record.Type.CUSTOMER,
            id: cliente,
            isDynamic: false
        });

        var correo = rec_cliente.getValue('email');

        log.audit({ title: "correo: ", details: correo });

        section = 'mail Personalizado';
        {
            var subjectText = '';
            var bodyText = '';
            try {
                var scriptObj = runtime.getCurrentScript();
                var userObj = runtime.getCurrentUser();
                subjectText = scriptObj.getParameter({ name: 'custscript_efx_fe_asunto_correo' }) || '';
                subjectText = subjectText.replace(/efx_folio/g, 'Factura-Pago');

                /*
                    Timbrado: efx_folio
                */
                bodyText = scriptObj.getParameter({ name: 'custscript_efx_fe_cuerpo_correo' }) || '';
                bodyText = bodyText.replace(/efx_folio/g, 'Factura-Pago');


                bodyText = '<div>' + clearHtmlText(bodyText) + '</div>';
                /*
                    <span><strong>La Factura se timbro el: efx_fecha </strong><span><br><p>Ver documentos adjunto.</p>
                */

            } catch (errorEmail) {
                // log.audit({ title: 'errorEmail', details: errorEmail.message });
                // log.audit({ title: 'errorEmail', details: JSON.stringify(errorEmail) });
                var fecha_t = new Date();
                subjectText = 'Timbrado: ' + 'Factura-Pago';
                bodyText = 'La Factura se timbro el: ' + fecha_t + '.\nVer documentos adjunto.';
                log.audit({ title: "errorEmail: ", details: errorEmail });
            }
        }
        section = 'author Email';
        {
            var correoFactura = scriptObj.getParameter({ name: 'custscript_efx_fe_correo_factura' }) || '';
            log.audit({ title: 'correoFactura', details: correoFactura });
            var emailAuthor = correoFactura ? correoFactura : userObj.id;
            log.audit({ title: 'emailAuthor', details: emailAuthor });
        }
        section = 'Send Email';
        {
            var emailText = correo;//context.request.parameters.custpage_email || '';
            var emailToSend = [];
            if (emailText) {
                emailToSend[0] =  emailText;
            }

            // log.audit({ title: "userObj: ", details: JSON.stringify(userObj) });
            log.audit({ title: "recipients: ", details: JSON.stringify(emailToSend) });
            log.audit({ title: "author: ", details: JSON.stringify(emailAuthor) });
            log.audit({ title: "author: ", details: emailAuthor });
            log.audit({ title: "subject: ", details: JSON.stringify(subjectText) });
            log.audit({ title: "body: ", details: JSON.stringify(bodyText) });


            var email_array = {
                author: '',
                recipients: '',
                subject: '',
                body:'',
                attachmentPdf: [],

            };

            if(!email_array){
                email_array = {
                    author: '',
                    recipients: '',
                    subject: '',
                    body:'',
                    attachmentPdf: [],

                };
            }

            email_array.author= emailAuthor;
            email_array.recipients= emailToSend;
            email_array.subject= subjectText;
            email_array.body= bodyText;
            email_array.attachmentPdf= attachments_record;

            return email_array;

        }
    }

    function clearHtmlText(htmlText) {
        var ret = unescape(htmlText);
        ret = htmlText.replace(/&gt;/g, '>');
        ret = ret.replace(/&lt;/g, '<');
        ret = ret.replace(/&quot;/g, '"');
        ret = ret.replace(/&apos;/g, "'");
        ret = ret.replace(/&amp;/g, '&');
        return ret;
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
