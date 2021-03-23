/**
 *@NApiVersion 2.x
 *@NScriptType Restlet
 *@Author        Marco Ramirez
 *@Created       03-03-2020
 *@ScriptName    IP - Prospectus Services RL
 *@Filename      IP_Prospectus_Services_RL.js
 *@ScriptID      customscript_efx_ip_customer_rl
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/record'], function(record) {

    function _post(context) {
        var respuesta = {
            success: false,
            ids:[]
        };

        if(!respuesta){
            respuesta = {
                success: false,
                ids: []
            };
        }

        if(context.registerType == "employee") {
            respuesta = employee(respuesta,context);
        }else if(context.registerType == "sale"){
            respuesta = sale(respuesta,context);

        }else{
            respuesta.success = false;
            respuesta.msg = 'El tipo de registro no es soportado.';
            respuesta.code = 10;
            respuesta.ids = [];
        }
        return respuesta;
    }

    function employee(respuesta,context) {
        var id = new Array();

            try{
                for(var i=0;i<context.data.length;i++){
                    if(!context.data[i].id || !context.data[i].name || !context.data[i].lastname) {
                        respuesta.msg = 'Cuerpo de la petición incorrecto. Faltan datos en los campos id, name o lastname';
                        respuesta.code = 50;
                    }else {
                        var ip_peticion = record.create({
                            type: 'customrecord_efx_ip_request',
                        });

                        ip_peticion.setValue({
                            fieldId: 'altname',
                            value: context.data[i].name
                        });

                        ip_peticion.setValue({
                            fieldId: 'custrecord_efx_ip_tipe',
                            value: 1
                        });
                        ip_peticion.setValue({
                            fieldId: 'custrecord_efx_ip_status',
                            value: 1
                        });

                        ip_peticion.setValue({
                            fieldId: 'custrecord_efx_ip_request',
                            value: JSON.stringify(context.data[i])
                        });

                        id[i] = ip_peticion.save({
                            enableSourcing: true,
                            igonoreMandatoryFields: true
                        });
                    }
                }

                respuesta.success = true;
                respuesta.ids = id;

            }catch(error){
                if(!respuesta){
                    respuesta = {
                        success: false,
                        msg: "",
                        code: 0,
                    };
                }
                respuesta.success = false;
                respuesta.msg = error;
                respuesta.code = 30;
                respuesta.ids = id;
                return respuesta;
            }

        if(context.data.length!=id.length){
            respuesta.success = false;
            respuesta.msg = 'No se registró completo el conjunto de datos.';
            respuesta.code = 20;
            respuesta.ids = id;
        }

        return respuesta;
    }

    function sale(respuesta,context) {
        var id = new Array();

        try{
            for(var i=0;i<context.data.length;i++){
                if(!context.data[i].idsale || !context.data[i].salenumber) {
                    respuesta.msg = 'Cuerpo de la petición incorrecto.';
                    respuesta.code = 50;
                    respuesta.success = false;
                    respuesta.ids = id;
                    return respuesta;
                }else {
                    var ip_peticion = record.create({
                        type: 'customrecord_efx_ip_request',
                    });

                    ip_peticion.setValue({
                        fieldId: 'altname',
                        value: context.data[i].salenumber
                    });

                    ip_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_tipe',
                        value: 2
                    });
                    ip_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_status',
                        value: 1
                    });

                    ip_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_request',
                        value: JSON.stringify(context.data[i])
                    });

                    id[i] = ip_peticion.save({
                        enableSourcing: true,
                        igonoreMandatoryFields: true
                    });
                }
            }

            respuesta.success = true;
            respuesta.ids = id;

        }catch(error){
            if(!respuesta){
                respuesta = {
                    success: false,
                    msg: "",
                    code: 0,
                };
            }
            respuesta.success = false;
            respuesta.msg = error;
            respuesta.code = 30;
            respuesta.ids = id;
            return respuesta;
        }

            if(context.data.length!=id.length){
                respuesta.success = false;
                respuesta.msg = 'No se registró completo el conjunto de datos.';
                respuesta.code = 20;
                respuesta.ids = id;
            }


        return respuesta;
    }

    return {
        post: _post,
    }
});
