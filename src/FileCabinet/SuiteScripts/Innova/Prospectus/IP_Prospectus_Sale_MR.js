/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@Author        Marco Ramirez
 *@Created       06-03-2020
 *@ScriptName    IP - Prospectus Sale MR
 *@Filename      IP_Prospectus_Sale_MR.js
 *@ScriptID      customscript_efx_ip_sale_mr
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/record','N/search','N/ui/serverWidget','N/url','N/https','N/runtime','N/format','N/file','N/email'], function(record, search,serverWidget,urlMod,https,runtime,format,file,email) {

    function getInputData() {
        try{
            var busqueda_ventas = search.create({
                type:'customrecord_efx_ip_request',
                filters:[['custrecord_efx_ip_status',search.Operator.ANYOF,1,3]
                    ,'and',
                    ['custrecord_efx_ip_tipe',search.Operator.ANYOF,2]
                    ,'and',
                    ['isinactive', search.Operator.IS, 'F']],
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
                    search.createColumn({name: 'custrecord_efx_ip_deposits'}),
                    search.createColumn({name: 'custrecord_efx_ip_invoice_disc'}),
                ]
            });
            return busqueda_ventas;
        }catch(error){
            log.error({title:'getInputData - error',details:error});
        }
    }

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

    function reduce(context) {
        log.audit({title: 'reduce', details: context});
        log.audit({title: 'reduce - values', details: JSON.parse(context.key)});
        var data_reduce = JSON.parse(context.values[0]);
        log.audit({title: 'data_reduce', details: data_reduce});
        var id = JSON.parse(context.key);
        var peticion = JSON.parse(data_reduce.custrecord_efx_ip_request);
        log.audit({title: 'peticion', details: peticion});
        var customer_id = peticion.client.name + ' ' + peticion.client.lastname;
        var id_prospectus_cus = peticion.client.idclient;

        var search_customer = search.create({
            type: search.Type.CUSTOMER,
            filters: [['entityid', search.Operator.IS, customer_id], 'OR', ['custentity_efx_ip_eid', search.Operator.IS, id_prospectus_cus]],
            columns: [
                search.createColumn({name: 'internalid'}),
            ]
        });

        var ejecutar = search_customer.run();
        var resultado = ejecutar.getRange(0, 100);
        var client_id = new Array();
        for (var x = 0; x < resultado.length; x++) {
            client_id[x] = resultado[x].getValue({name: 'internalid'}) || '';
        }
        log.audit({title: 'customer_id', details: client_id});

        //buscar hijos
        var id_prospectus_child = new Array();
        var child_id = new Array();
        var numero_childs = peticion.client.childs.length;
        var array_childs = peticion.client.childs;
        var array_childs_exist = new Array();

        log.audit({title: 'numero_childs', details: numero_childs});

        var filtro_childs = new Array();
        var fc = 0;
        for (var i = 0; i < numero_childs; i++) {
            fc++;
            id_prospectus_child[i] = peticion.client.childs[i].idchild;
            child_id[i] = peticion.client.childs[i].name + ' ' + peticion.client.childs[i].lastname;
            filtro_childs.push([['entityid', search.Operator.IS, child_id[i]], 'OR', ['custentity_efx_ip_eid', search.Operator.IS, id_prospectus_child[i]]]);
            if (fc < numero_childs) {
                filtro_childs.push('OR');
            }
        }

        log.audit({title: 'filtro_childs', details: filtro_childs});


        log.audit({title: 'id_prospectus_child', details: id_prospectus_child});
        log.audit({title: 'child_id', details: child_id});

        var search_child = search.create({
            type: search.Type.CUSTOMER,
            //filters:[['entityid',search.Operator.IS,child_id],'OR',['custentity_efx_ip_eid',search.Operator.IS,id_prospectus_child]],
            filters: filtro_childs,
            columns: [
                search.createColumn({name: 'internalid'}),
                search.createColumn({name: 'entityid'}),
                search.createColumn({name: 'firstname'}),
                search.createColumn({name: 'lastname'}),
                search.createColumn({name: 'custentity_efx_ip_eid'})
            ]
        });

        var ejecutar_child = search_child.run();
        var resultado_child = ejecutar_child.getRange(0, 100);
        log.audit({title: 'resultado_child', details: resultado_child});
        var internalid_child = new Array();
        var entityid_child = new Array();
        var custentity_efx_ip_eid_child = new Array();
        for (var y = 0; y < resultado_child.length; y++) {
            internalid_child[y] = resultado_child[y].getValue({name: 'internalid'}) || '';
            entityid_child[y] = resultado_child[y].getValue({name: 'firstname'}) + ' ' + resultado_child[y].getValue({name: 'lastname'});
            custentity_efx_ip_eid_child[y] = resultado_child[y].getValue({name: 'custentity_efx_ip_eid'}) || '';
        }

        log.audit({title: 'internalid_child', details: internalid_child});
        log.audit({title: 'entityid_child', details: entityid_child});
        log.audit({title: 'custentity_efx_ip_eid_child', details: custentity_efx_ip_eid_child});
        log.audit({title: 'array_childs', details: array_childs});

        //if(numero_childs!=resultado_child.length){
        var num_removed = numero_childs;
        for (var c = 0; c < numero_childs; c++) {
            for (var r = 0; r < resultado_child.length; r++) {
                if (child_id[c] == entityid_child[r] || id_prospectus_child[c] == custentity_efx_ip_eid_child[r]) {
                    for (var rev = 0; rev < array_childs.length; rev++) {
                        if (child_id[c] == (array_childs[rev].name + ' ' + array_childs[rev].lastname)) {
                            var removed = array_childs.splice(rev, 1);
                            removed[0].internalid = internalid_child[r];
                        }
                    }
                    array_childs_exist.push(removed[0]);
                }
            }
        }
        //}
        var internalid_employee = '';

        if(peticion.id_vendedor){
            var search_employee = search.create({
                type: search.Type.EMPLOYEE,
                filters:[['custentity_efx_ip_eid',search.Operator.IS,peticion.id_vendedor]],
                columns: [
                    search.createColumn({name: 'internalid'}),
                ]
            });

            var ejecutar_employee = search_employee.run();
            var resultado_employee = ejecutar_employee.getRange(0, 100);
            for (var y = 0; y < resultado_employee.length; y++) {
                internalid_employee = resultado_employee[y].getValue({name: 'internalid'}) || '';
            }
        }

        //Buscar ubicacion por id prospectus
        var busca_location = search.create({
           type: search.Type.LOCATION,
            filters:[['custrecord_efx_ip_locationid',search.Operator.IS,peticion.client.campus]],
            columns: [
                search.createColumn({name: 'internalid'}),
                search.createColumn({name: 'subsidiary'}),
            ]
        });

        var ejecutar_location = busca_location.run();
        var resultado_location = ejecutar_location.getRange(0,100);
        for(var bl=0; bl< resultado_location.length; bl++){
            var id_location = resultado_location[bl].getValue({name:'internalid'});

        }

        log.audit({title: 'id_location',details: id_location});


        var record_loc_subsi = record.load({
            type: record.Type.LOCATION,
            id: id_location,
            isDynamic: true
        });

        var id_subsidiaria_p = record_loc_subsi.getValue({
            fieldId: 'subsidiary',
        });

        log.audit({title: 'id_subsidiaria_p',details: id_subsidiaria_p});

        //Buscar factura relacionada

        try {
            var busca_fact100 = search.create({
                type: search.Type.INVOICE,
                filters: [['custbody_efx_ip_tid', search.Operator.IS, peticion.idsale]
                    ,'and',
                    //['amount', search.Operator.EQUALTO, 0]
                    //,'and',
                    //['mainline', search.Operator.IS, 'T']
                    ['item.custitem_efx_ip_item_type', search.Operator.ANYOF, '1']
                ],
                columns: [
                    search.createColumn({name: 'internalid'})
                ]
            });

            var ejecutar_fact100 = busca_fact100.run();
            var resultado_fact100 = ejecutar_fact100.getRange(0, 100);
            var escenario_100 = false;
            if (resultado_fact100.length > 0) {
                escenario_100 = true;
            }
            for (var ef = 0; ef < resultado_fact100.length; ef++) {
                var id_fac_des = resultado_fact100[ef].getValue({name: 'internalid'});
            }

            log.audit({title: 'escenario_100', details: escenario_100});
            log.audit({title: 'id_fac_des', details: id_fac_des});

            //Busca factura con descuento de 100%

            var busca_fact100_2 = search.create({
                type: search.Type.INVOICE,
                filters: [['custbody_efx_ip_tid', search.Operator.IS, peticion.idsale]
                    ,'and',
                    //['amount', search.Operator.EQUALTO, 0]
                    //,'and',
                    //['mainline', search.Operator.IS, 'T']
                    ['rate', search.Operator.EQUALTO, '-100']
                ],
                columns: [
                    search.createColumn({name: 'internalid'})
                ]
            });

            var ejecutar_fact100_2 = busca_fact100_2.run();
            var resultado_fact100_2 = ejecutar_fact100_2.getRange(0, 100);
            var escenario_100_2 = false;
            if (resultado_fact100_2.length > 0) {
                escenario_100_2 = true;
            }
            for (var ef = 0; ef < resultado_fact100_2.length; ef++) {
                var id_fac_des = resultado_fact100_2[ef].getValue({name: 'internalid'});
            }


        }catch(error_inv_100){
            log.audit({title: 'error_inv_100', details: error_inv_100});
        }

        var fact_100_per = false;
        if(escenario_100_2 && escenario_100){
            fact_100_per=true;
        }


        log.audit({title: 'client_id', details: client_id});
        log.audit({title: 'internalid_child', details: internalid_child});
        log.audit({title: 'array_childs', details: array_childs});
        log.audit({title: 'array_childs_exist', details: array_childs_exist});
        log.audit({title: 'context', details: context});

        var data_clientes = crear_clientes(client_id,internalid_child,array_childs,array_childs_exist,context,internalid_employee,id_location,id_subsidiaria_p);

        log.audit({title: 'data_clientes', details: data_clientes});
        log.audit({title: 'informacion',details:'Se crearon hijos: '+data_clientes.childs.length+' y se actualizaron hijos '+data_clientes.childs_exist.length});
        log.audit({title: 'Hijos nuevos', details: data_clientes.childs});
        log.audit({title: 'Hijos Existentes', details: data_clientes.childs_exist});

        //obtener escenarios y tipos de factura
        var id_items_prospectus = [];
        var id_items_netsuite = [];

        for(var id_art = 0; id_art<peticion.items.length; id_art++){
            id_items_prospectus[id_art]=peticion.items[id_art].iditem;
        }

        log.audit({title: 'id_items_prospectus', details: id_items_prospectus});

        var ip=0;
        var filtro_items = [];
        for (var i = 0; i < id_items_prospectus.length; i++) {
            ip++;
            filtro_items.push([['custitem_efx_ip_iid', search.Operator.IS, id_items_prospectus[i]]]);
            if (ip < id_items_prospectus.length) {
                filtro_items.push('OR');
            }
        }

        //Busqueda de Item
        for(var idp=0;idp<id_items_prospectus.length;idp++){
            var search_item = search.create({
                type: search.Type.SERVICE_ITEM,
                filters: filtro_items,
                columns: [
                    search.createColumn({name: 'internalid'}),
                ]
            });

            var ejecutar_item = search_item.run();
            var resultado_item = ejecutar_item.getRange(0, 100);
            for (var y = 0; y < resultado_item.length; y++) {
                id_items_netsuite.push(resultado_item[y].getValue({name: 'internalid'})) || '';
            }
        }

        for(var pi =0 ;pi<peticion.items.length;pi++){
            peticion.items[pi].iditem = id_items_netsuite[pi];
        }



        log.audit({title: 'id_items_netsuite', details: id_items_netsuite});

        for(var tipo=0;tipo<id_items_netsuite.length;tipo++) {

            var item_recor = record.load({
                type: record.Type.SERVICE_ITEM,
                id: id_items_netsuite[tipo],
                isDynamic: true
            });
            var tipo_articulo = item_recor.getValue('custitem_efx_ip_item_type');
        }

        //termina obtener escenarios y tipos de factura

        var data_deposit = {
            folio: '',
            error: ''
        };

        data_deposit = {
            folio: '',
            error: ''
        };

        if(data_reduce.custrecord_efx_ip_deposits){

            if(!data_deposit.folio){
                data_deposit = {
                    folio: data_reduce.custrecord_efx_ip_deposits.value,
                    error: ''
                };
            }
        }else {

            if (tipo_articulo == 1 || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.1) || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.05)) {
                if(!id_fac_des){
                    var data_deposit = crearDeposito(peticion, data_clientes,id_location,fact_100_per,tipo_articulo,id_subsidiaria_p);
                }

            }
        }

        log.audit({title: 'data_deposit', details: data_deposit});

        var data_invoice = {
            folio: '',
            error: ''
        };

        data_invoice = {
            folio: '',
            error: ''
        };

        if(data_reduce.custrecord_efx_ip_trans){

            if(!data_invoice.folio){
                data_invoice = {
                    folio: data_reduce.custrecord_efx_ip_trans.value,
                    error: ''
                };
            }
        }else{

                var data_invoice = crearInvoice(id,peticion,data_clientes,tipo_articulo,data_reduce,id_location,escenario_100,escenario_100_2,id_subsidiaria_p);

            //data_invoice es un json con atributos folio y error
        }


        log.audit({title: 'data_invoice', details: data_invoice});
        var data_payment = {
            folio: [],
            error: ''
        };

        data_payment = {
            folio: [],
            error: ''
        };

        if(data_reduce.custrecord_efx_ip_payments.length>0){

                data_payment = {
                    folio: data_reduce.custrecord_efx_ip_payments,
                    error: ''
                };

        }else {
            if(tipo_articulo == 2) {
                var data_payment = crearPagos(data_invoice, peticion,tipo_articulo);
            }
        }

        log.audit({title: 'data_reduce', details: data_reduce});
        //log.audit({title: 'data_reduce.custrecord_efx_ip_trans', details: data_reduce.custrecord_efx_ip_payments});
        //data_payment es un json con atributos folio y error

        log.audit({title: 'data_payment', details: data_payment});


        //Valida si la factura está o no timbrada
        if(data_invoice.folio) {

            var search_rvoe = search.create({
                type:'customrecord_efx_ip_rvoe',
                filters:[],
                columns:[
                    search.createColumn({name: 'custrecord_efx_ip_level_study'}),
                    search.createColumn({name: 'custrecord_efx_ip_rvoe_field'}),
                    search.createColumn({name: 'custrecord_efx_ip_location'}),
                ]
            });

            var ejecutar = search_rvoe.run();
            var resultado = ejecutar.getRange(0, 100);
            var rvoe_result = new Array();
            var location_result = new Array();
            var level_result = new Array();

            log.audit({title: 'resultado_rvoe', details: resultado});

            for (var x = 0; x < resultado.length; x++) {
                rvoe_result[x] = resultado[x].getValue({name: 'custrecord_efx_ip_rvoe_field'}) || '';
                location_result[x] = resultado[x].getValue({name: 'custrecord_efx_ip_location'}) || '';
                level_result[x] = resultado[x].getValue({name: 'custrecord_efx_ip_level_study'}) || '';
            }

            log.audit({title: 'rvoe_result', details: rvoe_result});

            var cfdi_record = record.load({
                type: record.Type.INVOICE,
                id: data_invoice.folio,
                isDynamic: false
            });

            var folio_invoice = cfdi_record.getValue('tranid');

            var invoice_lines = cfdi_record.getLineCount({
                sublistId: 'item'
            });

            var location_invoice = cfdi_record.getValue('location');
            var invoice_total = cfdi_record.getValue('total');

            for(var l=0;l<invoice_lines;l++){
                var study_level = cfdi_record.getSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_efx_fe_com_edu_nivel_edu',
                    line: l
                });
                for(var r=0;r<level_result.length;r++){

                    if(location_result[r]==location_invoice && study_level==level_result[r]){
                        cfdi_record.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_efx_fe_com_edu_clave_autrvoe',
                            line: l,
                            value: rvoe_result[r]
                        });
                    }
                }
            }

            var cfdi_invoice = cfdi_record.getValue({
                fieldId: 'custbody_efx_fe_uuid',
            });

            cfdi_record.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            if (!cfdi_invoice && invoice_total>0) {
                var factura_cfdi = timbrar_facturas(data_invoice, id);
            } else {
                var factura_cfdi = cfdi_invoice;
            }
        }

        log.audit({title: 'La factura se timbró con el uuid: ', details: factura_cfdi});


        //Valida si el pago está o no timbrado
        var pago_cfdi = new Array();
        try {
            for (var p = 0; p < data_payment.folio.length; p++) {

                var cfdi_record_payment = record.load({
                    type: record.Type.CUSTOMER_PAYMENT,
                    id: data_payment.folio[p],
                    isDynamic: true
                });

                var cfdi_payment = cfdi_record_payment.getValue({
                    fieldId: 'custbody_efx_fe_uuid',
                });

                if (!cfdi_payment) {
                    if (tipo_articulo == 2) {
                        pago_cfdi[p] = timbrar_pago(data_payment.folio[p], id);
                    }
                } else {
                    pago_cfdi[p] = cfdi_payment;
                }
            }
        }catch(error_cfdi_payment){
            log.audit({title: 'error_cfdi_payment', details: error_cfdi_payment});
        }
        log.audit({title: 'El pago se timbró con el uuid: ', details: pago_cfdi});


        //Se generan variables y actualizacion de registro de IP

        var parent = '';
        if(data_clientes.parent_exist){
            parent = 'Se actualizó';
        }else{
            parent='Se creó';
        }
        var notas = 'Registros nuevos de hijos: '+data_clientes.childs.length+' id: '+data_clientes.childs;
        notas = notas+'\n Registros actualizados de hijos: '+data_clientes.childs_exist.length+' id: '+ data_clientes.childs_exist;
        notas = notas +'\n'+ parent+' registro de padre con id: '+data_clientes.parents;
        notas = notas+'\nSe generó la factura: '+data_invoice.folio+' y se timbró con el uuid: '+factura_cfdi;
        notas = notas+'\nSe generó el pago: '+data_payment.folio+' y se timbró con el uuid: '+pago_cfdi;

        //agregar error a notas
        if(data_clientes.error || data_invoice.error /*|| data_payment.error*/){
            notas = notas+' '+data_clientes.error+' '+data_invoice.error;//+' '+data_payment.error;
        }


        var record_peticion = record.load({
            type: 'customrecord_efx_ip_request',
            id: id,
            isDynamic: true,
        });

            if (data_invoice.error /*|| data_payment.error*/ || data_clientes.error || (!factura_cfdi&&invoice_total>0)) {
                record_peticion.setValue({
                    fieldId: 'custrecord_efx_ip_status',
                    value: 3,
                    ignoreFieldChange: true
                });
            } else {
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

        record_peticion.setValue({
            fieldId: 'custrecord_efx_ip_notes',
            value: notas,
            ignoreFieldChange: true
        });

        record_peticion.setValue({
            fieldId: 'custrecord_efx_ip_customer',
            value: data_clientes.parents,
            ignoreFieldChange: true
        });

        if((tipo_articulo == 3 && (escenario_100|| escenario_100_2))){

                record_peticion.setValue({
                    fieldId: 'custrecord_efx_ip_invoice_disc',
                    value: id_fac_des,
                    ignoreFieldChange: true
                });

        }

        record_peticion.setValue({
            fieldId: 'custrecord_efx_ip_trans',
            value: data_invoice.folio,
            ignoreFieldChange: true
        });

        // if(tipo_articulo==3 && peticion.items[0].discountpercent==0) {
        //     record_peticion.setValue({
        //         fieldId: 'custrecord_efx_ip_payments',
        //         value: data_payment.folio,
        //         ignoreFieldChange: true
        //     });
        // }

        if(tipo_articulo == 1 || (tipo_articulo == 3 && peticion.items[0].discountpercent>0)) {

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_deposits',
                value: data_deposit.folio,
                ignoreFieldChange: true
            });
        }

        record_peticion.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });


        if(factura_cfdi){
            var mailData = createMail(folio_invoice,data_invoice.folio,peticion.client.email);
            log.audit({ title: "mailData: ", details: mailData });
            context.write({
                key: id,
                value: mailData
            });
        }
    }

    function summarize(context) {
        log.audit({title: 'context_sumarize', details: context});

        context.output.iterator().each(function(key, value) {
            log.audit({title: 'key', details: key});
            log.audit({title: 'value', details: value});
            var datos_mail = JSON.parse(value);
            log.audit({title: 'datos_mail', details: datos_mail});
            log.audit({title: 'datos_mail.recipients', details: datos_mail.recipients});
            log.audit({title: 'datos_mail.recipients.length', details: datos_mail.recipients.length});

            if(datos_mail.attachmentPdf && datos_mail.attachmentXml){
                var pdffile1 = file.load({id:datos_mail.attachmentPdf.id});
                var xmlfile1 = file.load({id:datos_mail.attachmentXml.id});

                if(datos_mail){
                    if (datos_mail.recipients.length > 0) {
                        email.send({
                            // author: userObj.id,
                            author: datos_mail.author,
                            recipients: datos_mail.recipients,
                            subject: datos_mail.subject,
                            body: datos_mail.body,
                            attachments: [pdffile1, xmlfile1]
                        });
                    }
                    log.audit({title: 'correo', details: 'enviado'});
                }

            }


            return true;
        });
    }

    function crearDescuentos(discountpercent,iditem,tipo_articulo,id_subsidiaria_p) {
        //custscript_efx_iva_discount

        try {
            var scriptObj = runtime.getCurrentScript();
           // var subsidiaria = scriptObj.getParameter({name: 'custscript_efx_ip_subsidiary'});
            var subsidiaria = id_subsidiaria_p;
            //var discount_account = scriptObj.getParameter({name: 'custscript_efx_ip_discount_account'});
            var discount_account = '';
            var tax_schedule = scriptObj.getParameter({name: 'custscript_efx_ip_taxschid'});

            log.audit({title: 'iditem', details: iditem});

            var disc_account_search = search.create({
                type: 'customrecord_efx_ip_disc_account',
                filters: [['isinactive', search.Operator.IS, 'F']
                        ,'AND',
                    ['custrecord_efx_ip_disc_item', search.Operator.IS, iditem]],
                columns: [
                    search.createColumn({name: 'custrecord_efx_ip_disc_cuenta'}),
                ]
            });

            var ejecutar_discacc = disc_account_search.run();
            var resultado_discacc = ejecutar_discacc.getRange(0, 100);

            log.audit({title: 'resultado_discacc.length', details: resultado_discacc.length});
            for (var da = 0; da < resultado_discacc.length; da++) {
                discount_account = resultado_discacc[da].getValue({name: 'custrecord_efx_ip_disc_cuenta'}) || '';
            }




            log.audit({title: 'subsidiaria', details: subsidiaria});
            log.audit({title: 'discount_account', details: discount_account});


            var discount_rate = 0;

            var discount_id = '';

            discount_rate = parseFloat(discountpercent) * (-100);

            var rate_percent = parseFloat(discount_rate)*-1;
            //var rate_percent = parseFloat(discount_rate);
            var rate_discount = format.format({value:rate_percent, type: format.Type.PERCENT});



            log.audit({title: 'discount_rate', details: discount_rate});
            log.audit({title: 'rate_discount', details: rate_discount});

            var search_discount = search.create({
                type: search.Type.DISCOUNT_ITEM,
                filters: [['price', search.Operator.EQUALTO, discount_rate]
                        ,'AND',
                        // ['subsidiary',search.Operator.ANYOF, subsidiaria]
                        // ,'AND',
                        ['account',search.Operator.ANYOF, discount_account]],
                columns: [
                    search.createColumn({name: 'internalid'}),
                ]
            });

            var ejecutar_discount = search_discount.run();
            var resultado_discount = ejecutar_discount.getRange(0, 100);

            if (resultado_discount.length > 0) {
                discount_id = resultado_discount[0].getValue({name: 'internalid'}) || '';
            } else {
                discount_id = ''
            }

            log.audit({title: 'discount_id', details: discount_id});

            if (!discount_id) {
                var ip_discount_item_ = record.create({
                    type: record.Type.DISCOUNT_ITEM,
                    isDynamic:true
                });

                ip_discount_item_.setValue({
                    fieldId: 'itemid',
                    value: 'Descuento ' + (rate_discount) + ' Prospectus'+' '+iditem
                });

                ip_discount_item_.setText({
                    fieldId: 'rate',
                    text: rate_discount
                });

                var array_subs = [1,2,3,4];

                ip_discount_item_.setValue({
                    fieldId: 'subsidiary',
                    value: array_subs
                });

                ip_discount_item_.setValue({
                    fieldId: 'account',
                    value: discount_account
                });

                ip_discount_item_.setValue({
                    fieldId: 'taxschedule',
                    value: tax_schedule
                });

                ip_discount_item_.setValue({
                    fieldId: 'description',
                    value: 'Descuento creado desde el script de integración con prospectus para el descuento del ' + discount_rate + '%'
                });

                var discount_id = ip_discount_item_.save({
                    enableSourcing: true,
                    igonoreMandatoryFields: true
                });

            }

            log.audit({title: 'discount_id', details: discount_id});

            return discount_id;
        }catch(error_descuentos){
            log.audit({title: 'error_descuentos', details: error_descuentos});
        }

    }

    function timbrar_pago(data_payment,id,id_subsidiaria_p) {
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

    function timbrar_facturas(data_invoice,id,id_subsidiaria_p){
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

    function crearDeposito(peticion,data_clientes,id_location,fact_100_per,tipo_articulo,id_subsidiaria_p){
        try{
            var deposit_json = {
                folio: '',
                error: ''
            };

            if(!deposit_json){
                deposit_json = {
                    folio: '',
                    error: ''
                };
            }

            var monto =0;
            for(var i=0;i<peticion.payments.length;i++){
                monto = monto+peticion.payments[i].amount;
            }

            var ip_peticion_deposit = record.create({
                type: record.Type.CUSTOMER_DEPOSIT,
            });

            ip_peticion_deposit.setValue({
                fieldId: 'customer',
                value: data_clientes.parents
            });

            ip_peticion_deposit.setValue({
                fieldId: 'payment',
                value: monto
            });

            ip_peticion_deposit.setValue({
                fieldId: 'location',
                value: id_location
            });

            ip_peticion_deposit.setValue({
                fieldId: 'custbody_efx_ip_discount',
                value: peticion.items[0].discountpercent
            });

            ip_peticion_deposit.setValue({
                fieldId: 'custbody_efx_ip_glimpact',
                value: true
            });

            if(tipo_articulo==1){
                ip_peticion_deposit.setValue({
                    fieldId: 'custbody_efx_ip_deposittype',
                    value: 1
                });

                if(peticion.items[0].discountpercent==1){
                    ip_peticion_deposit.setValue({
                        fieldId: 'custbody_efx_ip_glimpact_desc',
                        value: true
                    });
                }

            }

            if(tipo_articulo==3){
                ip_peticion_deposit.setValue({
                    fieldId: 'custbody_efx_ip_deposittype',
                    value: 2
                });

            }

            var id_registro_invoice = ip_peticion_deposit.save({
                enableSourcing: true,
                igonoreMandatoryFields: true
            });

            deposit_json.folio = id_registro_invoice;

            return deposit_json;

        }catch(error_deposit){
            log.audit({title: 'error_deposit', details: error_deposit});
            deposit_json.error = error_deposit;
            return deposit_json;
        }
    }

    function crearPagos(data_invoice,peticion,id_subsidiaria_p,tipo_articulo){
        try{

            var scriptObj = runtime.getCurrentScript();
            var cliente_pg = scriptObj.getParameter({ name: 'custscript_efx_ip_pgclient' });

            var payment_json = {
                folio: [],
                error: ''
            };

            if(!payment_json){
                payment_json = {
                    folio: [],
                    error: ''
                };
            }

            var fecha_pago = new Date();
            var fecha_de_pago = fecha_pago.getDate()+'/'+(fecha_pago.getMonth()+1)+'/'+fecha_pago.getFullYear();

            log.audit({title: 'fecha_pago', details: fecha_pago});
            log.audit({title: 'fecha_de_pago', details: fecha_de_pago});

            for(var paym=0;paym<peticion.payments.length;paym++) {

                var registro_payment = record.transform({
                    fromType: record.Type.INVOICE,
                    fromId: data_invoice.folio,
                    toType: record.Type.CUSTOMER_PAYMENT
                });


                registro_payment.setValue({
                    fieldId: "custbody_efx_fe_formapago",
                    value: peticion.forma_pago,
                    ignoreFieldChange: true
                });

                // if(peticion.forma_pago=='3'){
                //     registro_payment.setValue({
                //         fieldId: "custbody_efx_fe_metodopago",
                //         value: 1,
                //         ignoreFieldChange: true
                //     });
                //
                //     registro_payment.setValue({
                //         fieldId: "custbody_efx_fe_usocfdi",
                //         value: 21,
                //         ignoreFieldChange: true
                //     });
                // }else{
                    if(tipo_articulo==3){
                       // if(peticion.stamp==true){
                            registro_payment.setValue({
                                fieldId: 'custbody_efx_fe_usocfdi',
                                value: 21
                            });
                        // }else{
                        //     registro_payment.setValue({
                        //         fieldId: 'custbody_efx_fe_usocfdi',
                        //         value: peticion.uso_cfdi
                        //     });
                        // }

                    }else{
                        registro_payment.setValue({
                            fieldId: 'custbody_efx_fe_usocfdi',
                            value: peticion.uso_cfdi
                        });
                    }


                    registro_payment.setValue({
                        fieldId: 'custbody_efx_fe_metodopago',
                        value: peticion.metodo_pago

                    });
                //}

                if(!peticion.stamp){
                    registro_payment.setValue({
                        fieldId: 'custbody_efx_fe_entity_timbra',
                        value: cliente_pg
                    });
                }



                registro_payment.setValue({
                    fieldId: "custbody_efx_fe_fecha_de_pago",
                    value: fecha_pago,
                    ignoreFieldChange: true
                });

                // registro_payment.setValue({
                //     fieldId: "applied",
                //     value: peticion.payments.amount,
                //     ignoreFieldChange: true
                // });
                //
                // registro_payment.setValue({
                //     fieldId: "origtotal",
                //     value: peticion.payments.amount,
                //     ignoreFieldChange: true
                // });
                //
                // registro_payment.setValue({
                //     fieldId: "payment",
                //     value: peticion.payments.amount,
                //     ignoreFieldChange: true
                // });
                //
                // registro_payment.setValue({
                //     fieldId: "total",
                //     value: peticion.payments.amount,
                //     ignoreFieldChange: true
                // });


                var linecount = registro_payment.getLineCount({
                    sublistId: 'apply'
                });

                log.audit({title: 'peticion.payments.amount', details: peticion.payments[paym].amount});
                log.audit({title: 'linecount', details: linecount});

                for(var lc=0;lc<linecount;lc++){

                    var factura = registro_payment.getSublistValue({
                        sublistId: 'apply',
                        fieldId: 'internalid',
                        line: lc
                    });

                    if(data_invoice.folio==factura){
                        registro_payment.setSublistValue({
                            sublistId: 'apply',
                            fieldId: 'amount',
                            line: lc,
                            value: peticion.payments[paym].amount
                        });
                    }
                }

                var id_registro_payment = registro_payment.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.audit({title: 'id_registro_payment', details: id_registro_payment});
                payment_json.folio.push(id_registro_payment);
            }

            return payment_json;

        }catch(error_pagos){
            log.audit({title: 'errora_pagos', details: error_pagos});
            payment_json.error = error_pagos;
            return payment_json;
        }
    }
    
    function crearInvoice(id,peticion,data_clientes,tipo_articulo,data_reduce,id_location,escenario_100,escenario_100_2,id_subsidiaria_p) {
        try {

            //Buscar registro de articulos con iva

            try {
                var iva_search = search.create({
                    type: 'customrecord_efx_ip_ivaitems',
                    filters: [['isinactive', search.Operator.IS, 'F']],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'custrecord_efx_ip_itemstax'}),
                    ]
                });

                var ejecutar_iva = iva_search.run();
                var resultado_iva = ejecutar_iva.getRange(0, 100);

                var internalid_iva = '';
                var item_iva = '';


                for (var ri = 0; ri < resultado_iva.length; ri++) {
                    internalid_iva = resultado_iva[ri].getValue({name: 'internalid'}) || '';
                    item_iva = resultado_iva[ri].getValue({name: 'custrecord_efx_ip_itemstax'}) || '';
                }

                var articulos_iva = item_iva.split(',');

                log.audit({title: 'internalid_iva', details: internalid_iva});
                log.audit({title: 'articulos_iva', details: articulos_iva});
            }catch(error_iva){
                log.audit({title: 'error_iva', details: error_iva});
            }

            //crear fechas de ciclos escolares

            var ciclo_s = peticion.ciclo_start;
            var ciclo_e = peticion.ciclo_end;

            var start = ciclo_s.split('-');
            var end = ciclo_e.split('-');

            var date_start = new Date();
            date_start.setDate(start[2]);
            date_start.setFullYear(start[0]);
            date_start.setMonth((start[1]*1)-1);

            log.audit({title: 'date_start', details: date_start});

            var date_end = new Date();
            date_end.setDate(end[2]);
            date_end.setFullYear(end[0]);
            date_end.setMonth((end[1]*1)-1);

            log.audit({title: 'date_end', details: date_end});

            //Busqueda de id de periodo contable agosto
            var startdate = new Date();
            var enddate = new Date();
            //var start_year = startdate.getFullYear();
            var start_year = start[0];
            if(parseInt(start[1])>9){
                var start_year = parseInt(start[0])+1;
            }


            var start_date = '';
            var end_date = '';

            if(tipo_articulo==1){
                start_date = '01/08/'+start_year;
                end_date = '31/08/'+start_year;
            }else if((tipo_articulo == 3 && peticion.items[0].discountpercent==0.1) || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.05) || (tipo_articulo == 3 && (escenario_100_2 || escenario_100))){
                start_date = '01/09/'+start_year;
                end_date = '30/09/'+start_year;
            }

            if((peticion.items[0].discountpercent==1&&tipo_articulo==3)){
                start_date = '01/08/'+start_year;
                end_date = '31/08/'+start_year;
            }


            if(tipo_articulo==1 || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.1) || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.05) || (tipo_articulo == 3 && (escenario_100_2 || escenario_100))) {
                var period_search = search.create({
                    type: search.Type.ACCOUNTING_PERIOD,
                    filters: [['startdate', search.Operator.ON, start_date], 'AND', ['enddate', search.Operator.ON, end_date]],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'periodname'}),
                        search.createColumn({name: 'startdate'})
                    ]
                });


                // if((peticion.items[0].discountpercent==1&&tipo_articulo==2)){
                //     if(data_reduce.custrecord_efx_ip_trans){
                //
                //     }else{
                //         var data_invoice_100 = crearInvoice_100(id,peticion,data_clientes,tipo_articulo);
                //         log.audit({title: 'data_invoice_100', details: data_invoice_100});
                //     }
                // }




                var ejecutar_period = period_search.run();
                var resultado_period = ejecutar_period.getRange(0, 100);

                var internalid_period = '';
                var name_period = '';

                for (var p = 0; p < resultado_period.length; p++) {
                    internalid_period = resultado_period[p].getValue({name: 'internalid'}) || '';
                    name_period = resultado_period[p].getValue({name: 'periodname'}) || '';
                    var fecha_period = resultado_period[p].getValue({name: 'startdate'}) || '';
                }
                log.audit({title: 'fecha_period', details: fecha_period});
                var periodo_fecha = fecha_period.split('/');


                log.audit({title: 'periodo_fecha', details: periodo_fecha});

                var date_period = new Date();
                date_period.setDate(periodo_fecha[0]);
                date_period.setFullYear(periodo_fecha[2]);
                date_period.setMonth((periodo_fecha[1]*1)-1);
                log.audit({title: 'date_period', details: date_period});

            }
            //Fin de la busqueda

            var scriptObj = runtime.getCurrentScript();
            var cliente_pg = scriptObj.getParameter({ name: 'custscript_efx_ip_pgclient' });
            var tax_discount = scriptObj.getParameter({name: 'custscript_efx_tax_discount'});
            var tax_discount_iva = scriptObj.getParameter({name: 'custscriptcustscript_efx_iva_discount'});



            //cambiar idprospectus por internalid cliente para agregar a la sublista item
            var childs_json = {
                idchild: '',
                internalid:''
            };

            if(!childs_json){
                childs_json = {
                    idchild: '',
                    internalid:''
                };
            }

            var array_childs_inv = new Array();

            if(data_clientes.childs.length>0){
                for(var chj = 0; chj<data_clientes.childs.length;chj++){
                    var record_ch = record.load({
                        type: record.Type.CUSTOMER,
                        id: data_clientes.childs[chj],
                        isDynamic: true
                    });

                    childs_json = {
                        idchild: '',
                        internalid:'',
                        pricelevel:''
                    };

                    childs_json.idchild = record_ch.getValue('custentity_efx_ip_eid');
                    childs_json.pricelevel = record_ch.getValue('pricelevel');
                    childs_json.internalid = data_clientes.childs[chj];
                    array_childs_inv.push(childs_json);
                }
            }

            if(data_clientes.childs_exist.length>0){
                for(var chje = 0; chje<data_clientes.childs_exist.length;chje++){
                    var record_ch_e = record.load({
                        type: record.Type.CUSTOMER,
                        id: data_clientes.childs_exist[chje],
                        isDynamic: true
                    });
                    childs_json = {
                        idchild: '',
                        internalid:'',
                        pricelevel:''
                    };

                    childs_json.idchild = record_ch_e.getValue('custentity_efx_ip_eid');
                    childs_json.pricelevel = record_ch_e.getValue('pricelevel');
                    childs_json.internalid = data_clientes.childs_exist[chje];
                    array_childs_inv.push(childs_json);
                }
            }

            //termina idchild a internalid

            log.audit({title: 'array_childs_inv', details: array_childs_inv});

            var invoice_json = {
                folio: '',
                error: ''
            };

            if(!invoice_json){
                invoice_json = {
                    folio: '',
                    error: ''
                };
            }

            var array_articulos = new Array();
            var discount = {
              id_discount:'',
              tax_discount:'',
              amount_discount:''
            };

            if(!discount){
                discount = {
                    id_discount:'',
                    tax_discount:'',
                    amount_discount:'',
                    idchild:''
                };
            }
            var array_discounts = new Array();
            var array_idchild = new Array();
            var array_idprospectuschild = new Array();
            var array_pricelevel = new Array();

            for(var y=0;y<peticion.items.length;y++){
                for(var t=0;t<array_childs_inv.length;t++){
                    if(array_childs_inv[t].idchild == peticion.items[y].idchild){
                        peticion.items[y].idchild = array_childs_inv[t].internalid;
                        array_idchild.push(array_childs_inv[t].idchild);
                        array_pricelevel.push(array_childs_inv[t].pricelevel);
                    }
                }



                array_articulos.push(peticion.items[y]);
                log.audit({title: 'array_pricelevel', details: array_pricelevel});
                log.audit({title: 'array_idchild', details: array_idchild});
                log.audit({title: 'array_articulos', details: array_articulos});
                discount = {
                    id_discount:'',
                    tax_discount:'',
                    amount_discount:'',
                    idchild:''
                };
                if(peticion.items[y].discountpercent>0){
                    var ip_descuentos = crearDescuentos(peticion.items[y].discountpercent,peticion.items[y].iditem,tipo_articulo,id_subsidiaria_p);

                    discount.id_discount=ip_descuentos;
                    discount.tax_discount=tax_discount;
                    discount.amount_discount=peticion.items[y].discountamount;
                    discount.idchild=peticion.items[y].idchild;
                    discount.id_art = peticion.items[y].iditem

                    log.audit({title: 'discount', details: discount});

                    array_idchild.push(array_childs_inv[y].idchild);
                    array_articulos.push(discount);
                    log.audit({title: 'array_articulos', details: array_articulos});
                    log.audit({title: 'array_idchild', details: array_idchild});
                }
            }



            var ref_Bancaria = buscarRefBanc(array_articulos);

            var ip_peticion_invoice = record.create({
                type: record.Type.INVOICE,
            });

            ip_peticion_invoice.setValue({
                fieldId: 'entity',
                value: data_clientes.parents
            });

            log.audit({title: 'peticion.ciclo_start', details: peticion.ciclo_start});
            log.audit({title: 'peticion.ciclo_end', details: peticion.ciclo_end});
            log.audit({title: 'date_start', details: date_start});
            try {
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_ip_ciclo_start',
                    value: date_start
                });

                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_ip_ciclo_end',
                    value: date_end
                });
            }catch(e){
                log.audit({title: 'error fechas', details: e});
            }


            ip_peticion_invoice.setValue({
                fieldId: 'approvalstatus',
                value: 2
            });

            log.audit({title: 'internalid_period', details: internalid_period});
            log.audit({title: 'tipo_articulo', details: tipo_articulo});
            log.audit({title: 'date_period', details: date_period});

            if(tipo_articulo==1 || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.1) || (tipo_articulo == 3 && peticion.items[0].discountpercent==0.1) || (tipo_articulo == 3 && (escenario_100_2 || escenario_100))) {
                if (internalid_period) {
                    ip_peticion_invoice.setValue({
                        fieldId: 'postingperiod',
                        value: internalid_period
                    });

                    ip_peticion_invoice.setValue({
                        fieldId: 'trandate',
                        value: date_period
                    });
                }
            }


            ip_peticion_invoice.setValue({
                fieldId: 'location',
                value: id_location
            });

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_ref_banc',
                value: ref_Bancaria
            });

            // if(!peticion.stamp || tipo_articulo == 3){
            //     ip_peticion_invoice.setValue({
            //         fieldId: 'custbody_efx_fe_entity_timbra',
            //         value: cliente_pg
            //     });
            // }

            if(!peticion.stamp){
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_entity_timbra',
                    value: cliente_pg
                });
            }

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_fe_formapago',
                value: peticion.forma_pago
            });

            // if(peticion.forma_pago=='3'){
            //     ip_peticion_invoice.setValue({
            //         fieldId: 'custbody_efx_fe_usocfdi',
            //         value: 21
            //     });
            //
            //     ip_peticion_invoice.setValue({
            //         fieldId: 'custbody_efx_fe_metodopago',
            //         value: 1
            //     });
            // }else{

                if(tipo_articulo==3){
                    //if(peticion.stamp==true){
                        ip_peticion_invoice.setValue({
                            fieldId: 'custbody_efx_fe_usocfdi',
                            value: 21
                        });
                    // }else{
                    //     ip_peticion_invoice.setValue({
                    //         fieldId: 'custbody_efx_fe_usocfdi',
                    //         value: peticion.uso_cfdi
                    //     });
                    // }

                }else{
                    ip_peticion_invoice.setValue({
                        fieldId: 'custbody_efx_fe_usocfdi',
                        value: peticion.uso_cfdi
                    });
                }


                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_metodopago',
                    value: peticion.metodo_pago

                });
            //}

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_ip_tid',
                value: peticion.idsale
            });

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_ip_parentid',
                value: peticion.client.idclient
            });

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_ip_salenumber',
                value: peticion.salenumber
            });

            if((tipo_articulo==3 || tipo_articulo==1) && peticion.stamp==true){
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_complemento_educativo',
                    value: true
                });
            }

            log.audit({title: 'array_articulos.length', details: array_articulos.length});
            for (var i = 0; i < array_articulos.length; i++) {
                log.audit({title: 'i', details: i});
                log.audit({title: 'array_articulos[i].id_discount', details: array_articulos[i].id_discount});

                log.audit({title: 'array_articulos[i].id_discount', details: array_articulos[i].id_discount});
                log.audit({title: 'array_articulos[i]', details: array_articulos[i]});
                if(array_articulos[i].id_discount){
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                        value: array_articulos[i].id_discount
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_idchild',
                        line: i,
                        value: array_articulos[i].idchild
                    });


                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_childprospectus',
                        line: i,
                        value: array_idchild[i]
                    });

                    var iva_disc_art = 0;
                    for(var ai=0;ai<articulos_iva.length;ai++){
                        if(array_articulos[i].id_art==articulos_iva[ai]){
                            ip_peticion_invoice.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                line: i,
                                value: tax_discount_iva
                            });
                            iva_disc_art++;
                        }
                    }
                    if(iva_disc_art==0){

                            ip_peticion_invoice.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                line: i,
                                value: array_articulos[i].tax_discount
                            });

                    }





                }else {

                    log.audit({title: 'array_articulos[i].rate', details: array_articulos[i].rate});
                    for(var ai=0;ai<articulos_iva.length;ai++){
                        if(array_articulos[i].iditem==articulos_iva[ai]){
                            array_articulos[i].rate = parseFloat(array_articulos[i].rate)/1.16;
                            array_articulos[i].subtotal = parseFloat(array_articulos[i].subtotal)/1.16;
                        }
                    }
                    log.audit({title: 'array_articulos[i].rate', details: array_articulos[i].rate});

                    log.audit({title: 'array_articulos[i].iditem', details: array_articulos[i].iditem});
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                        value: array_articulos[i].iditem
                    });


                    log.audit({title: 'array_articulos[i].idchild', details: array_articulos[i].idchild});
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_idchild',
                        line: i,
                        value: array_articulos[i].idchild
                    });

                    log.audit({title: 'array_idchild[i]', details: array_idchild[i]});
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_childprospectus',
                        line: i,
                        value: array_idchild[i]
                    });

                    log.audit({title: 'array_pricelevel[i]', details: array_pricelevel[i]});


                    // if(tipo_articulo!=3){
                    if(array_pricelevel[i]){
                        ip_peticion_invoice.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'price',
                            line: i,
                            value: array_pricelevel[i]
                        });
                    }
                // }


                    log.audit({title: 'array_articulos[i].quantity', details: array_articulos[i].quantity});
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: array_articulos[i].quantity
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i,
                        value: array_articulos[i].rate
                    });
                    log.audit({title: 'array_articulos[i].subtotal', details: array_articulos[i].subtotal});
                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: i,
                        value: array_articulos[i].subtotal
                    });
                }

            }

            var data_invoice_pet = ip_peticion_invoice.toJSON();

            log.audit({title: 'ip_peticion_invoice', details: data_invoice_pet.sublists});

            var id_registro_invoice = ip_peticion_invoice.save({
                enableSourcing: true,
                igonoreMandatoryFields: true
            });

            log.audit({title: 'id_registro_invoice', details: id_registro_invoice});



            // if((peticion.items[0].discountpercent==1&&tipo_articulo==2) || (peticion.items[0].discountpercent==0.05&&peticion.items[1].discountpercent==0.1&&tipo_articulo==2)||(peticion.items[1].discountpercent==0.05&&peticion.items[0].discountpercent==0.1&&tipo_articulo==2)){
            //     invoice_json.folio = data_invoice_100;
            //     var factura_100 = id_registro_invoice;
            // }else{
            //     invoice_json.folio = id_registro_invoice;
            //
            // }
            invoice_json.folio = id_registro_invoice;


            var record_peticion = record.load({
                type: 'customrecord_efx_ip_request',
                id: id,
                isDynamic: true,
            });

            // if((peticion.items[0].discountpercent==1&&tipo_articulo==2) || (peticion.items[0].discountpercent==0.05&&peticion.items[1].discountpercent==0.1&&tipo_articulo==2)||(peticion.items[1].discountpercent==0.05&&peticion.items[0].discountpercent==0.1&&tipo_articulo==2)){
            //     record_peticion.setValue({
            //         fieldId: 'custrecord_efx_ip_invoice_disc',
            //         value: factura_100,
            //         ignoreFieldChange: true
            //     });
            // }

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_trans',
                value: invoice_json.folio,
                ignoreFieldChange: true
            });
            record_peticion.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

            return invoice_json;
        }catch(error_invoice){
            log.audit({title: 'error_invoice', details: error_invoice});
            invoice_json.error = error_invoice;
            return invoice_json;
        }
    }

    /*function crearInvoice_100(id,peticion,data_clientes,tipo_articulo) {
        try {

            //crear fechas para ciclos escolares

            var ciclo_s = peticion.ciclo_start;
            var ciclo_e = peticion.ciclo_end;

            var start = ciclo_s.split('-');
            var end = ciclo_e.split('-');

            var date_start = new Date();
            date_start.setDate(start[2]);
            date_start.setFullYear(start[0]);
            date_start.setMonth(parseInt(start[1])-1);

            log.audit({title: 'date_start', details: date_start});

            var date_end = new Date();
            date_end.setDate(end[2]);
            date_end.setFullYear(end[0]);
            date_end.setMonth(parseInt(end[1])-1);

            log.audit({title: 'date_end', details: date_end});

            //Busqueda de id de periodo contable agosto
            var startdate = new Date();
            var enddate = new Date();
            var start_year = startdate.getFullYear();

            var start_date = '';
            var end_date = '';

            if(tipo_articulo==1){
                start_date = '01/08/'+start_year;
                end_date = '31/08/'+start_year;
            }else if(tipo_articulo==3){
                start_date = '01/09/'+start_year;
                end_date = '30/09/'+start_year;
            }


            if(tipo_articulo==1 || tipo_articulo==3) {
                var period_search = search.create({
                    type: search.Type.ACCOUNTING_PERIOD,
                    filters: [['startdate', search.Operator.ON, start_date], 'AND', ['enddate', search.Operator.ON, end_date]],
                    columns: [
                        search.createColumn({name: 'internalid'}),
                        search.createColumn({name: 'periodname'})
                    ]
                });


                if((peticion.items[0].discountpercent==1&&tipo_articulo==3) || (peticion.items[0].discountpercent==0.05&&peticion.items[1].discountpercent==0.1&&tipo_articulo==3)||(peticion.items[1].discountpercent==0.05&&peticion.items[0].discountpercent==0.1&&tipo_articulo==3)){

                }


                var ejecutar_period = period_search.run();
                var resultado_period = ejecutar_period.getRange(0, 100);

                var internalid_period = '';
                var name_period = '';

                for (var p = 0; p < resultado_period.length; p++) {
                    internalid_period = resultado_period[p].getValue({name: 'internalid'}) || '';
                    name_period = resultado_period[p].getValue({name: 'periodname'}) || '';
                }
            }
            //Fin de la busqueda

            var scriptObj = runtime.getCurrentScript();
            var cliente_pg = scriptObj.getParameter({ name: 'custscript_efx_ip_pgclient' });
            var tax_discount = scriptObj.getParameter({name: 'custscript_efx_tax_discount'});


            //cambiar idprospectus por internalid cliente para agregar a la sublista item
            var childs_json = {
                idchild: '',
                internalid:''
            };

            if(!childs_json){
                childs_json = {
                    idchild: '',
                    internalid:''
                };
            }

            var array_childs_inv = new Array();

            if(data_clientes.childs.length>0){
                for(var chj = 0; chj<data_clientes.childs.length;chj++){
                    var record_ch = record.load({
                        type: record.Type.CUSTOMER,
                        id: data_clientes.childs[chj],
                        isDynamic: true
                    });

                    childs_json = {
                        idchild: '',
                        internalid:''
                    };

                    childs_json.idchild = record_ch.getValue('custentity_efx_ip_eid');
                    childs_json.internalid = data_clientes.childs[chj];
                    array_childs_inv.push(childs_json);
                }
            }

            if(data_clientes.childs_exist.length>0){
                for(var chje = 0; chje<data_clientes.childs_exist.length;chje++){
                    var record_ch_e = record.load({
                        type: record.Type.CUSTOMER,
                        id: data_clientes.childs_exist[chje],
                        isDynamic: true
                    });
                    childs_json = {
                        idchild: '',
                        internalid:''
                    };

                    childs_json.idchild = record_ch_e.getValue('custentity_efx_ip_eid');
                    childs_json.internalid = data_clientes.childs_exist[chje];
                    array_childs_inv.push(childs_json);
                }
            }

            //termina idchild a internalid

            log.audit({title: 'array_childs_inv', details: array_childs_inv});

            var invoice_json = {
                folio: '',
                error: ''
            };

            if(!invoice_json){
                invoice_json = {
                    folio: '',
                    error: ''
                };
            }

            var array_articulos = new Array();
            var discount = {
                id_discount:'',
                tax_discount:'',
                amount_discount:''
            };

            if(!discount){
                discount = {
                    id_discount:'',
                    tax_discount:'',
                    amount_discount:'',
                    idchild:''
                };
            }
            var array_discounts = new Array();

            for(var y=0;y<peticion.items.length;y++){
                for(var t=0;t<array_childs_inv.length;t++){
                    if(array_childs_inv[t].idchild == peticion.items[y].idchild){
                        peticion.items[y].idchild = array_childs_inv[t].internalid;
                    }
                }

                array_articulos.push(peticion.items[y]);
                log.audit({title: 'array_articulos', details: array_articulos});
                discount = {
                    id_discount:'',
                    tax_discount:'',
                    amount_discount:'',
                    idchild:''
                };
                if(peticion.items[y].discountpercent>0){

                    var ip_descuentos = crearDescuentos(peticion.items[y].discountpercent);

                    discount.id_discount=ip_descuentos;
                    discount.tax_discount=tax_discount;
                    discount.amount_discount=peticion.items[y].discountamount;
                    discount.idchild=peticion.items[y].idchild;
                    log.audit({title: 'discount', details: discount});

                    array_articulos.push(discount);
                    log.audit({title: 'array_articulos', details: array_articulos});
                }
            }

            var ip_peticion_invoice = record.create({
                type: record.Type.INVOICE,
            });

            ip_peticion_invoice.setValue({
                fieldId: 'entity',
                value: data_clientes.parents
            });

            log.audit({title: 'peticion.ciclo_start', details: peticion.ciclo_start});
            log.audit({title: 'peticion.ciclo_end', details: peticion.ciclo_end});

            try {
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_ip_ciclo_start',
                    value: date_start
                });

                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_ip_ciclo_end',
                    value: date_end
                });
            }catch(e){
                log.audit({title: 'error fechas', details: e});
            }


            // ip_peticion_invoice.setValue({
            //     fieldId: 'approvalstatus',
            //     value: 2
            // });

            log.audit({title: 'internalid_period', details: internalid_period});
            log.audit({title: 'tipo_articulo', details: tipo_articulo});
            if(tipo_articulo==1 || tipo_articulo==3) {
                if (internalid_period) {
                    ip_peticion_invoice.setValue({
                        fieldId: 'postingperiod',
                        value: internalid_period
                    });
                }
            }


            ip_peticion_invoice.setValue({
                fieldId: 'location',
                value: peticion.client.campus
            });

            if(!peticion.stamp || tipo_articulo == 2){
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_entity_timbra',
                    value: cliente_pg
                });
            }

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_fe_formapago',
                value: peticion.forma_pago
            });

            if(peticion.forma_pago=='3'){
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_usocfdi',
                    value: 21
                });

                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_metodopago',
                    value: 2
                });
            }else{
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_usocfdi',
                    value: peticion.uso_cfdi
                });

                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_metodopago',
                    value: peticion.metodo_pago
                });
            }

            ip_peticion_invoice.setValue({
                fieldId: 'custbody_efx_ip_tid',
                value: peticion.idsale
            });

            if(tipo_articulo==3 || tipo_articulo==1){
                ip_peticion_invoice.setValue({
                    fieldId: 'custbody_efx_fe_complemento_educativo',
                    value: true
                });
            }

            for (var i = 0; i < peticion.items.length; i++) {

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: i,
                        value: peticion.items[i].iditem
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_efx_ip_idchild',
                        line: i,
                        value: peticion.items[i].idchild
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'quantity',
                        line: i,
                        value: peticion.items[i].quantity
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'rate',
                        line: i,
                        value: peticion.items[i].rate
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        line: i,
                        value: tax_discount
                    });

                    ip_peticion_invoice.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: i,
                        value: peticion.items[i].subtotal
                    });


            }

            var id_registro_invoice = ip_peticion_invoice.save({
                enableSourcing: true,
                igonoreMandatoryFields: true
            });

            log.audit({title: 'id_registro_invoice', details: id_registro_invoice});

            invoice_json.folio = id_registro_invoice;

            var record_peticion = record.load({
                type: 'customrecord_efx_ip_request',
                id: id,
                isDynamic: true,
            });
            // record_peticion.setValue({
            //     fieldId: 'custrecord_efx_ip_invoice_disc',
            //     value: invoice_json.folio,
            //     ignoreFieldChange: true
            // });
            record_peticion.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });


            return invoice_json.folio;
        }catch(error_invoice){
            log.audit({title: 'error_invoice', details: error_invoice});
            invoice_json.error = error_invoice;

        }
    }*/

    function crear_clientes(client_id,internalid_child,array_childs,array_childs_exist,context,internalid_employee,id_location,id_subsidiaria_p){

        var clientes_json = {
            parent_exist: false,
            parents: '',
            childs: [],
            childs_exist:[],
            error: ''
        };

        if(!clientes_json){
            clientes_json = {
                parent_exist: true,
                parents: '',
                childs: [],
                childs_exist:[],
                error: ''
            };
        }

        var scriptObj = runtime.getCurrentScript();
        //var subsidiaria = scriptObj.getParameter({ name: 'custscript_efx_ip_subsidiary' });
        var subsidiaria = id_subsidiaria_p;
        var receivable_acc = scriptObj.getParameter({ name: 'custscript_efx_ip_receivableacct' });
        var child_form = scriptObj.getParameter({ name: 'custscript_efx_ip_childform' });
        var parent_form = scriptObj.getParameter({ name: 'custscript_efx_ip_parentform' });

        var data_reduce = JSON.parse(context.values[0]);
        var id = JSON.parse(context.key);
        var peticion = JSON.parse(data_reduce.custrecord_efx_ip_request);
        var articulo_tipo = peticion.items[0].iditem;

        log.audit({title: 'peticion-cliente', details: peticion});

        var ciclo_s = peticion.ciclo_start;
        var ciclo_e = peticion.ciclo_end;

        var start = ciclo_s.split('-');
        var end = ciclo_e.split('-');

        log.audit({title: 'start', details: start});
        log.audit({title: 'end', details: end});

        var date_start = new Date();
        date_start.setDate(start[2]);
        date_start.setFullYear(start[0]);
        date_start.setMonth((start[1]*1)-1);

        log.audit({title: 'date_start', details: date_start});

        var date_end = new Date();
        date_end.setDate(end[2]);
        date_end.setFullYear(end[0]);
        date_end.setMonth((end[1]*1)-1);

        log.audit({title: 'date_end', details: date_end});


        var idcontacto = contactos(peticion.client.email,peticion.client.name,peticion.client.lastname,subsidiaria,id_subsidiaria_p);
        log.audit({title: 'idcontacto', details: idcontacto});
        //Se va a crear un cliente padre nuevo
        if(client_id.length<=0) {
            try {

                var ip_peticion_client = record.create({
                    type: record.Type.CUSTOMER,
                });

                ip_peticion_client.setValue({
                    fieldId: 'isperson',
                    value: 'T'
                });

                ip_peticion_client.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiaria
                });

                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_fe_contact_email',
                    value: idcontacto
                });

                ip_peticion_client.setValue({
                    fieldId: 'firstname',
                    value: peticion.client.name
                });

                ip_peticion_client.setValue({
                    fieldId: 'salesrep',
                    value: internalid_employee
                });

                ip_peticion_client.setValue({
                    fieldId: 'customform',
                    value: parent_form
                });

                ip_peticion_client.setValue({
                    fieldId: 'category',
                    value: 1
                });


                try{
                    ip_peticion_client.setValue({
                        fieldId: 'receivablesaccount',
                        value: receivable_acc
                    });
                }catch(error_recivable){
                    log.audit({title: 'error_recivable', details: error_recivable});
                }



                ip_peticion_client.setValue({
                    fieldId: 'lastname',
                    value: peticion.client.lastname
                });
                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_ip_eid',
                    value: peticion.client.idclient
                });

                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_ip_campus',
                    value: id_location
                });

                ip_peticion_client.setValue({
                    fieldId: 'email',
                    value: peticion.client.email
                });

                ip_peticion_client.setValue({
                    fieldId: 'phone',
                    value: peticion.client.phone
                });

                ip_peticion_client.setValue({
                    fieldId: 'mobilephone',
                    value: peticion.client.cellphone
                });

                //billadress information
                ip_peticion_client.setValue({
                    fieldId: 'billaddressee',
                    value: peticion.client.billAddress.atendee
                });

                ip_peticion_client.setValue({
                    fieldId: 'billaddr1',
                    value: peticion.client.billAddress.addresee
                });

                ip_peticion_client.setValue({
                    fieldId: 'billaddr2',
                    value: peticion.client.billAddress.address1
                });

                ip_peticion_client.setValue({
                    fieldId: 'billcountry',
                    value: peticion.client.billAddress.country
                });

                ip_peticion_client.setValue({
                    fieldId: 'billstate',
                    value: peticion.client.billAddress.state
                });

                ip_peticion_client.setValue({
                    fieldId: 'billzip',
                    value: peticion.client.billAddress.zip
                });

                ip_peticion_client.setValue({
                    fieldId: 'vatregnumber',
                    value: peticion.client.billAddress.rfc
                });

                try {
                    for (var adr = 0; adr < peticion.client.adresses.length; adr++) {

                        ip_peticion_client.setSublistValue({
                            sublistId: 'addressbook',
                            fieldId: 'label',
                            line: adr,
                            value: peticion.client.adresses[adr].addresee
                        });

                        // ip_peticion_client.setSublistValue({
                        //     sublistId: 'addressbook',
                        //     fieldId: 'defaultbilling',
                        //     line: 0,
                        //     value: true
                        // });

                        var subrec = ip_peticion_client.getSublistSubrecord({
                            sublistId: 'addressbook',
                            fieldId: 'addressbookaddress',
                            line: adr
                        });

                        subrec.setValue({
                            fieldId: 'addr2',
                            value: peticion.client.adresses[adr].address1
                        });

                        subrec.setValue({
                            fieldId: 'addr1',
                            value: peticion.client.adresses[adr].addresee
                        });

                        // subrec.setValue({
                        //     fieldId: 'addressee',
                        //     value: peticion.client.billAddress.atendee
                        // });

                        subrec.setValue({
                            fieldId: 'country',
                            value: peticion.client.adresses[adr].country
                        });

                        subrec.setValue({
                            fieldId: 'state',
                            value: peticion.client.adresses[adr].state
                        });

                        subrec.setValue({
                            fieldId: 'city',
                            value: peticion.client.adresses[adr].city
                        });

                        subrec.setValue({
                            fieldId: 'zip',
                            value: peticion.client.adresses[adr].zip
                        });
                        // Save the sublist line.
                    }
                }catch(error_adress){
                    log.audit({title: 'error_adress', details: error_adress});
                }

                var id_registro_cliente = ip_peticion_client.save({
                    enableSourcing: true,
                    igonoreMandatoryFields: true
                });

                log.audit({title: 'Se generó el cliente padre con id:', details: id_registro_cliente});

                clientes_json.parents = id_registro_cliente;

                //Si no existe ningun hijo registrado
                if(internalid_child.length<=0){
                    var id_registro_child = new Array();

                    for(var ch=0;ch<array_childs.length;ch++){
                        var ip_peticion_child = record.create({
                            type: record.Type.CUSTOMER,
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'isperson',
                            value: 'T'
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'subsidiary',
                            value: subsidiaria
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'firstname',
                            value: array_childs[ch].name
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'lastname',
                            value: array_childs[ch].lastname
                        });

                        if(articulo_tipo!=2){
                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ecurp',
                                value: array_childs[ch].curp
                            });
                        }


                        try {
                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ciclo_start',
                                value: date_start
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ciclo_end',
                                value: date_end
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_cicloescolar',
                                value: peticion.ciclo_name
                            });
                        }catch(e){

                        }

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_eid',
                            value: array_childs[ch].idchild
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_campus',
                            value: id_location
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_egrade',
                            value: array_childs[ch].grade
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_level',
                            value: array_childs[ch].level
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'parent',
                            value: id_registro_cliente
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'category',
                            value: 2
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'customform',
                            value: child_form
                        });

                        id_registro_child[ch] = ip_peticion_child.save({
                            enableSourcing: true,
                            igonoreMandatoryFields: true
                        });

                        clientes_json.childs.push(id_registro_child[ch]);
                    }

                }else{
                    //actualizar hijos existentes y crear nuevo si es el caso con padre como referencia

                    var id_registro_child = new Array();
                    var id_child_exist = new Array();
                        if(array_childs.length>0){
                            for(var ch=0;ch<array_childs.length;ch++){
                                var ip_peticion_child = record.create({
                                    type: record.Type.CUSTOMER,
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'isperson',
                                    value: 'T'
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'subsidiary',
                                    value: subsidiaria
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'firstname',
                                    value: array_childs[ch].name
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'lastname',
                                    value: array_childs[ch].lastname
                                });

                                if(articulo_tipo!=2) {
                                    ip_peticion_child.setValue({
                                        fieldId: 'custentity_efx_ip_ecurp',
                                        value: array_childs[ch].curp
                                    });
                                }

                                try {
                                    ip_peticion_child.setValue({
                                        fieldId: 'custentity_efx_ip_ciclo_start',
                                        value: date_start
                                    });

                                    ip_peticion_child.setValue({
                                        fieldId: 'custentity_efx_ip_ciclo_end',
                                        value: date_end
                                    });

                                    ip_peticion_child.setValue({
                                        fieldId: 'custentity_efx_ip_cicloescolar',
                                        value: peticion.ciclo_name
                                    });
                                }catch(e){

                                }

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_eid',
                                    value: array_childs[ch].idchild
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_campus',
                                    value: id_location
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_egrade',
                                    value: array_childs[ch].grade
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_level',
                                    value: array_childs[ch].level
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'parent',
                                    value: id_registro_cliente
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'category',
                                    value: 2
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'customform',
                                    value: child_form
                                });

                                id_registro_child[ch] = ip_peticion_child.save({
                                    enableSourcing: true,
                                    igonoreMandatoryFields: true
                                });

                                clientes_json.childs.push(id_registro_child[ch]);
                            }
                        }

                        if(array_childs_exist.length>0){
                            for(var ch_e=0;ch_e<array_childs_exist.length;ch_e++){
                                var child_exist = record.load({
                                    type: record.Type.CUSTOMER,
                                    id: array_childs_exist[ch_e].internalid,
                                    isDynamic: true
                                });

                                //internalid_chid es el id encontrado de cliente
                                //y array_childs_exist es el array con json del cliente de prospectur
                                //la posicion del id corresponde con la del json
                                child_exist.setValue({
                                    fieldId: 'parent',
                                    value: id_registro_cliente,
                                    ignoreFieldChange: true
                                });

                                child_exist.setValue({
                                    fieldId: 'category',
                                    value: 2,
                                    ignoreFieldChange: true
                                });

                                child_exist.setValue({
                                    fieldId: 'customform',
                                    value: child_form,
                                    ignoreFieldChange: true
                                });



                                child_exist.setValue({
                                    fieldId: 'subsidiary',
                                    value: subsidiaria
                                });

                                child_exist.setValue({
                                    fieldId: 'firstname',
                                    value: array_childs_exist[ch_e].name
                                });

                                child_exist.setValue({
                                    fieldId: 'lastname',
                                    value: array_childs_exist[ch_e].lastname
                                });

                                if(articulo_tipo!=2) {
                                    child_exist.setValue({
                                        fieldId: 'custentity_efx_ip_ecurp',
                                        value: array_childs_exist[ch_e].curp
                                    });
                                }


                                try {
                                    child_exist.setValue({
                                        fieldId: 'custentity_efx_ip_ciclo_start',
                                        value: date_start
                                    });

                                    child_exist.setValue({
                                        fieldId: 'custentity_efx_ip_ciclo_end',
                                        value: date_end
                                    });

                                    child_exist.setValue({
                                        fieldId: 'custentity_efx_ip_cicloescolar',
                                        value: peticion.ciclo_name
                                    });
                                }catch(e){

                                }

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_eid',
                                    value: array_childs_exist[ch_e].idchild
                                });

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_campus',
                                    value: id_location
                                });

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_egrade',
                                    value: array_childs_exist[ch_e].grade
                                });

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_level',
                                    value: array_childs_exist[ch_e].level
                                });

                                id_child_exist[ch_e]=child_exist.save({
                                    enableSourcing: true,
                                    ignoreMandatoryFields: true
                                });

                                clientes_json.childs_exist.push(id_child_exist[ch_e]);
                            }
                        }
                }
                clientes_json.parent_exist = false;
                //Aqui termina la creacion de un cliente padre nuevo y nuevos hijos o actualización de hijos.
            } catch (error_new) {
                log.error({title: 'reduce - error', details: error_new});
               clientes_json.error = error_new;
               return clientes_json;
            }
            //actualización de cliente padre ya existente, creando o actualizando hijos.
        }else {
            try {
                log.audit({title: 'existe', details: 'existe registro'});
                log.audit({title: 'client_id[0]', details: client_id[0]});

                clientes_json.parents = client_id[0];
                clientes_json.parent_exist = true;

                log.audit({title: 'clientes_json.parents', details: clientes_json.parents});
                log.audit({title: 'clientes_json.parent_exist', details: clientes_json.parent_exist});
                //Actualizar cliente padre

                var ip_peticion_client = record.load({
                    type: record.Type.CUSTOMER,
                    id: client_id[0],

                });

                log.audit({title: 'ip_peticion_client', details: ip_peticion_client});

                ip_peticion_client.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiaria,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_fe_contact_email',
                    value: idcontacto,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'firstname',
                    value: peticion.client.name,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'lastname',
                    value: peticion.client.lastname,
                    ignoreFieldChange: true
                });
                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_ip_eid',
                    value: peticion.client.idclient,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'custentity_efx_ip_campus',
                    value: id_location,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'email',
                    value: peticion.client.email,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'salesrep',
                    value: internalid_employee,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'category',
                    value: 1,
                    ignoreFieldChange: true
                });



                ip_peticion_client.setValue({
                    fieldId: 'customform',
                    value: parent_form,
                    ignoreFieldChange: true
                });



                try{
                    ip_peticion_client.setValue({
                        fieldId: 'receivablesaccount',
                        value: receivable_acc,
                        ignoreFieldChange: true
                    });
                }catch(error_recivable){
                    log.audit({title: 'error_recivable', details: error_recivable});
                }

                ip_peticion_client.setValue({
                    fieldId: 'phone',
                    value: peticion.client.phone,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'mobilephone',
                    value: peticion.client.cellphone,
                    ignoreFieldChange: true
                });

                ip_peticion_client.setValue({
                    fieldId: 'vatregnumber',
                    value: peticion.client.billAddress.rfc,
                    ignoreFieldChange: true
                });


                try {
                    ip_peticion_client.setSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'label',
                        line: 0,
                        value: peticion.client.adresses[0].addresee,
                        ignoreFieldChange: true
                    });

                    ip_peticion_client.setSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'defaultbilling',
                        line: 0,
                        value: true,
                        ignoreFieldChange: true
                    });


                    var subrec = ip_peticion_client.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: 0
                    });

                    log.audit({title: 'subrec', details: subrec});


                    subrec.setValue({
                        fieldId: 'addr2',
                        value: peticion.client.adresses[0].address1,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'addr1',
                        value: peticion.client.adresses[0].addresee,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'addressee',
                        value: peticion.client.billAddress.atendee,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'country',
                        value: peticion.client.adresses[0].country,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'state',
                        value: peticion.client.adresses[0].state,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'city',
                        value: peticion.client.adresses[0].city,
                        ignoreFieldChange: true
                    });

                    subrec.setValue({
                        fieldId: 'zip',
                        value: peticion.client.adresses[0].zip,
                        ignoreFieldChange: true
                    });
                    // Save the sublist line.
                }catch(error_billadres){
                    log.audit({title: 'error_billadres', details: error_billadres});
                }
                log.audit({title: 'antes de sublist', details: 'aqui toy'});


                ip_peticion_client.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });


                log.audit({title: 'Se actualizo cliente', details: 'se actualizo' + client_id[0]});

                //


                if (internalid_child.length <= 0) {
                    var id_registro_child = new Array();

                    for (var ch = 0; ch < array_childs.length; ch++) {
                        var ip_peticion_child = record.create({
                            type: record.Type.CUSTOMER,
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'isperson',
                            value: 'T'
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'subsidiary',
                            value: subsidiaria
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'firstname',
                            value: array_childs[ch].name
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'lastname',
                            value: array_childs[ch].lastname
                        });

                        if(articulo_tipo!=2) {
                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ecurp',
                                value: array_childs[ch].curp
                            });
                        }

                        try {
                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ciclo_start',
                                value: date_start
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_ciclo_end',
                                value: date_end
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_cicloescolar',
                                value: peticion.ciclo_name
                            });

                        }catch(e){

                        }
                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_eid',
                            value: array_childs[ch].idchild
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_campus',
                            value: id_location,

                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_egrade',
                            value: array_childs[ch].grade
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'custentity_efx_ip_level',
                            value: array_childs[ch].level
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'parent',
                            value: client_id[0]
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'category',
                            value: 2
                        });

                        ip_peticion_child.setValue({
                            fieldId: 'customform',
                            value: child_form
                        });



                        id_registro_child[ch] = ip_peticion_child.save({
                            enableSourcing: true,
                            igonoreMandatoryFields: true
                        });

                        clientes_json.childs.push(id_registro_child[ch]);
                    }

                } else {
                    //actualizar hijos existentes y crear nuevo si es el caso con padre como referencia
                    var id_registro_child = new Array();
                    var id_child_exist = new Array();
                    log.audit({title:'array_childs',details:array_childs.length});

                    if (array_childs.length > 0) {

                        for (var ch = 0; ch < array_childs.length; ch++) {
                            var ip_peticion_child = record.create({
                                type: record.Type.CUSTOMER,
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'isperson',
                                value: 'T'
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'subsidiary',
                                value: subsidiaria
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'firstname',
                                value: array_childs[ch].name
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'lastname',
                                value: array_childs[ch].lastname
                            });

                            if(articulo_tipo!=2) {
                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_ecurp',
                                    value: array_childs[ch].curp
                                });
                            }

                            try {
                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_ciclo_start',
                                    value: date_start
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_ciclo_end',
                                    value: peticion.ciclo_end
                                });

                                ip_peticion_child.setValue({
                                    fieldId: 'custentity_efx_ip_cicloescolar',
                                    value: date_end
                                });
                            }catch(e){

                            }

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_eid',
                                value: array_childs[ch].idchild
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_campus',
                                value: id_location,

                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_egrade',
                                value: array_childs[ch].grade
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'custentity_efx_ip_level',
                                value: array_childs[ch].level
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'parent',
                                value: client_id[0]
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'category',
                                value: 2
                            });

                            ip_peticion_child.setValue({
                                fieldId: 'customform',
                                value: child_form
                            });

                            id_registro_child[ch] = ip_peticion_child.save({
                                enableSourcing: true,
                                igonoreMandatoryFields: true
                            });

                            clientes_json.childs.push(id_registro_child[ch]);
                        }
                    }
                    if (array_childs_exist.length > 0) {

                        for (var ch_e = 0; ch_e < array_childs_exist.length; ch_e++) {
                            var child_exist = record.load({
                                type: record.Type.CUSTOMER,
                                id: array_childs_exist[ch_e].internalid,
                                isDynamic: true
                            });

                            log.audit({title:'child_exist',details:child_exist});
                            log.audit({title:'array_childs_exist[ch_e]',details:array_childs_exist[ch_e]});
                            //internalid_chid es el id encontrado de cliente
                            //y array_childs_exist es el array con json del cliente de prospectur
                            //la posicion del id corresponde con la del json
                            child_exist.setValue({
                                fieldId: 'parent',
                                value: client_id[0],
                                ignoreFieldChange: true
                            });

                            child_exist.setValue({
                                fieldId: 'category',
                                value: 2,
                                ignoreFieldChange: true
                            });

                            child_exist.setValue({
                                fieldId: 'customform',
                                value: child_form,
                                ignoreFieldChange: true
                            });

                            child_exist.setValue({
                                fieldId: 'subsidiary',
                                value: subsidiaria
                            });

                            child_exist.setValue({
                                fieldId: 'firstname',
                                value: array_childs_exist[ch_e].name
                            });

                            child_exist.setValue({
                                fieldId: 'lastname',
                                value: array_childs_exist[ch_e].lastname
                            });

                            if(articulo_tipo!=2) {
                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_ecurp',
                                    value: array_childs_exist[ch_e].curp
                                });
                            }

                            try {
                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_ciclo_start',
                                    value: date_start
                                });

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_ciclo_end',
                                    value: date_end
                                });

                                child_exist.setValue({
                                    fieldId: 'custentity_efx_ip_cicloescolar',
                                    value: peticion.ciclo_name
                                });

                            }catch(e){

                            }
                            child_exist.setValue({
                                fieldId: 'custentity_efx_ip_eid',
                                value: array_childs_exist[ch_e].idchild
                            });

                            child_exist.setValue({
                                fieldId: 'custentity_efx_ip_campus',
                                value: id_location,

                            });

                            child_exist.setValue({
                                fieldId: 'custentity_efx_ip_egrade',
                                value: array_childs_exist[ch_e].grade
                            });

                            child_exist.setValue({
                                fieldId: 'custentity_efx_ip_level',
                                value: array_childs_exist[ch_e].level
                            });

                            id_child_exist[ch_e] = child_exist.save({
                                enableSourcing: true,
                                ignoreMandatoryFields: true
                            });

                            clientes_json.childs_exist.push(id_child_exist[ch_e]);
                        }
                    }
                }
            }catch(error_exist){
                log.audit({title:'Error Padre Exist', details: error_exist});

            }
        }
        return clientes_json;
    }

    function contactos(contacto,nombre,apellido,subsidiaria,id_subsidiaria_p){

        var contacto_nombre = nombre + ' ' + apellido;

        var search_contact = search.create({
            type: search.Type.CONTACT,
            filters:[['email',search.Operator.IS,contacto]
                    ,'OR',
                    ['entityid',search.Operator.IS,contacto_nombre]],
            columns: [
                search.createColumn({name: 'internalid'}),
            ]
        });

        var ejecutar_contact = search_contact.run();
        log.audit({title: 'ejecutar_contact', details: ejecutar_contact});
        var resultado_contact = ejecutar_contact.getRange(0, 100);
        log.audit({title: 'resultado_contact', details: resultado_contact});

        var array_contact = new Array();
        for (var y = 0; y < resultado_contact.length; y++) {
            array_contact[y] = resultado_contact[y].getValue({name: 'internalid'}) || '';
        }

        log.audit({title: 'array_contact', details: array_contact});

        var id_contacto = 0;
        log.audit({title: 'array_contact.length', details: array_contact.length});
        if(array_contact.length<=0){
            try {
                var ip_peticion_contact = record.create({
                    type: record.Type.CONTACT,
                });

                ip_peticion_contact.setValue({
                    fieldId: 'entityid',
                    value: nombre + ' ' + apellido
                });

                ip_peticion_contact.setValue({
                    fieldId: 'firstname',
                    value: nombre
                });

                ip_peticion_contact.setValue({
                    fieldId: 'lastname',
                    value: apellido
                });

                ip_peticion_contact.setValue({
                    fieldId: 'email',
                    value: contacto
                });

                ip_peticion_contact.setValue({
                    fieldId: 'subsidiary',
                    value: id_subsidiaria_p
                });

                id_contacto = ip_peticion_contact.save({
                    enableSourcing: true,
                    igonoreMandatoryFields: true
                });
            }catch(error_contact){
                log.audit({title:'error_contact',details:error_contact});
            }
        }else{
            id_contacto = array_contact[0];

            var ip_peticion_contact = record.load({
                type: record.Type.CONTACT,
                id: id_contacto,

            });

            ip_peticion_contact.setValue({
                fieldId: 'entityid',
                value: nombre + ' ' + apellido,
                ignoreFieldChange: true
            });

            ip_peticion_contact.setValue({
                fieldId: 'firstname',
                value: nombre,
                ignoreFieldChange: true
            });

            ip_peticion_contact.setValue({
                fieldId: 'lastname',
                value: apellido,
                ignoreFieldChange: true
            });

            ip_peticion_contact.setValue({
                fieldId: 'email',
                value: contacto,
                ignoreFieldChange: true
            });

            ip_peticion_contact.setValue({
                fieldId: 'subsidiary',
                value: id_subsidiaria_p,
                ignoreFieldChange: true
            });

            ip_peticion_contact.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });

        }

        return id_contacto;

    }

    function buscarRefBanc(articulo){
        var articulo_child = articulo[0].iditem;
        var alumno_child = articulo[0].idchild;

        var search_ref = search.create({
            type: 'customrecord_efx_db_txt_referencia',
            filters:[['custrecord_efx_db_ref_customer',search.Operator.IS,alumno_child]
                    ,'and',
                    ['custrecord_efx_db_ref_item',search.Operator.IS,articulo_child]],
            columns: [
                search.createColumn({name: 'custrecord_efx_db_ref_ref'}),
            ]
        });

        var ejecutar_ref = search_ref.run();
        log.audit({title: 'ejecutar_ref', details: ejecutar_ref});
        var resultado_ref = ejecutar_ref.getRange(0, 100);
        log.audit({title: 'resultado_ref', details: resultado_ref});


        for (var y = 0; y < resultado_ref.length; y++) {
            var ref_bancaria = resultado_ref[y].getValue({name: 'custrecord_efx_db_ref_ref'}) || '';
        }
        log.audit({title: 'ref_bancaria', details: ref_bancaria});
        return ref_bancaria;
    }

    function createMail(folio_invoice,idfactura,correo){

        log.audit({ title: "folio_invoice: ", details: folio_invoice });
        log.audit({ title: "idfactura: ", details: idfactura });
        log.audit({ title: "correo: ", details: correo });
        try {

            var cfdi_record = record.load({
                type: record.Type.INVOICE,
                id: idfactura,
                isDynamic: false
            });

            var fecha_timbrado = cfdi_record.getValue('custbody_efx_fe_fecha_timbrado');

            var url_pdf = cfdi_record.getValue('custbody_efx_fe_pdf_file_ns');
            var url_xml = cfdi_record.getValue('custbody_efx_fe_xml_file_ns');

            var pdf_ruta = url_pdf.substr(24);
            var xml_ruta = url_xml.substr(24);

            var pdf_id = pdf_ruta.split('&');
            var xml_id = xml_ruta.split('&');


            var xmlAttachment = file.load({
                id: xml_id[0]
            });

            var pdfAttachment = file.load({
                id: pdf_id[0]
            });

        }catch(error_archivos){
            log.audit({ title: "error_archivos: ", details: error_archivos });
        }

        section = 'mail Personalizado';
        {
            var subjectText = '';
            var bodyText = '';
            try {
                var scriptObj = runtime.getCurrentScript();
                var userObj = runtime.getCurrentUser();
                subjectText = scriptObj.getParameter({ name: 'custscript_efx_fe_asunto_correo' }) || '';
                subjectText = subjectText.replace(/efx_folio/g, folio_invoice);
                subjectText = subjectText.replace(/efx_fecha/g, fecha_timbrado);
                /*
                    Timbrado: efx_folio
                */
                bodyText = scriptObj.getParameter({ name: 'custscript_efx_fe_cuerpo_correo' }) || '';
                bodyText = bodyText.replace(/efx_folio/g, folio_invoice);
                bodyText = bodyText.replace(/efx_fecha/g, fecha_timbrado);

                bodyText = '<div>' + clearHtmlText(bodyText) + '</div>';
                /*
                    <span><strong>La Factura se timbro el: efx_fecha </strong><span><br><p>Ver documentos adjunto.</p>
                */

            } catch (errorEmail) {
                // log.audit({ title: 'errorEmail', details: errorEmail.message });
                // log.audit({ title: 'errorEmail', details: JSON.stringify(errorEmail) });
                subjectText = 'Timbrado: ' + folio_invoice;
                bodyText = 'La Factura se timbro el: ' + fecha_timbrado + '.\nVer documentos adjunto.';
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
            log.audit({ title: "attachments: ", details: JSON.stringify(xmlAttachment) + ' '+ pdfAttachment});

            var email_array = {
                author: '',
                recipients: '',
                subject: '',
                body:'',
                attachmentPdf: '',
                attachmentXml: ''
            };

            if(!email_array){
                email_array = {
                    author: '',
                    recipients: '',
                    subject: '',
                    body:'',
                    attachmentPdf: '',
                    attachmentXml: ''
                };
            }

                email_array.author= emailAuthor;
                email_array.recipients= emailToSend;
                email_array.subject= subjectText;
                email_array.body= bodyText;
                email_array.attachmentPdf= pdfAttachment;
                email_array.attachmentXml= xmlAttachment;


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
    }
});
