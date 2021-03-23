/**
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@Author        Marco Ramirez
 *@Created       04-03-2020
 *@ScriptName    IP - Prospectus Employee MR
 *@Filename      IP_Prospectus_Employee_MR.js
 *@ScriptID      customscript_efx_ip_employee_mr
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/record','N/search','N/ui/serverWidget','N/runtime','N/format'], function(record, search,serverWidget,runtime,format) {

    function getInputData() {
        try{
            var busqueda_empleado = search.create({
                type:'customrecord_efx_ip_request',
                filters:[['custrecord_efx_ip_status',search.Operator.ANYOF,1,3]
                    ,'and',
                    ['custrecord_efx_ip_tipe',search.Operator.ANYOF,1]],
                columns:[
                    search.createColumn({name: 'name'}),
                    search.createColumn({name: 'created'}),
                    search.createColumn({name: 'lastmodified'}),
                    search.createColumn({name: 'custrecord_efx_ip_tipe'}),
                    search.createColumn({name: 'custrecord_efx_ip_processing'}),
                    search.createColumn({name: 'custrecord_efx_ip_stamp'}),
                    search.createColumn({name: 'custrecord_efx_ip_status'}),
                    search.createColumn({name: 'custrecord_efx_ip_request'}),
                    search.createColumn({name: 'custrecord_efx_ip_employee'}),
                ]
            });
            return busqueda_empleado;
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
        var scriptObj = runtime.getCurrentScript();
        var subsidiaria = scriptObj.getParameter({name: 'custscript_efx_ip_subsidiary'});
        log.audit({title:'reduce',details:context});
        log.audit({title:'reduce - values',details:JSON.parse(context.key)});
        var data_reduce = JSON.parse(context.values[0]);
        var id = JSON.parse(context.key);
        var peticion = JSON.parse(data_reduce.custrecord_efx_ip_request);
        var enployee_id = peticion.name+' '+peticion.lastname;
        var id_prospectus_emp = peticion.id;

        log.audit({title:'enployee_id',details:enployee_id});

        var search_employee = search.create({
            type: search.Type.EMPLOYEE,
            filters:[['email',search.Operator.IS,peticion.email],'OR',['custentity_efx_ip_eid',search.Operator.IS,id_prospectus_emp]],
            columns:[
                search.createColumn({name: 'internalid'}),
            ]
        });
        var ejecutar = search_employee.run();
        var resultado = ejecutar.getRange(0,100);
        var entity_id = new Array();
        for(var x=0; x<resultado.length;x++){
            entity_id[x] = resultado[x].getValue({name:'internalid'}) || '';
        }

        log.audit({title:'entityid',details:entity_id});

        if(entity_id.length<=0) {

            // try {
            //     var datecreated = data_reduce.created;
            //     var datamodified = data_reduce.lastmodified;
            //     var proccessed = data_reduce.custrecord_efx_ip_processing;
            //     var timbrado = data_reduce.custrecord_efx_ip_stamp;
            //     var status = data_reduce.custrecord_efx_ip_status.value;
            //     var empleado = data_reduce.custrecord_efx_ip_employee;
            //     var id_registro = '';
            //
            //     var ip_peticion = record.create({
            //         type: record.Type.EMPLOYEE,
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'subsidiary',
            //         value: subsidiaria
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'firstname',
            //         value: peticion.name
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'lastname',
            //         value: peticion.lastname
            //     });
            //     ip_peticion.setValue({
            //         fieldId: 'custentity_efx_ip_eid',
            //         value: peticion.id
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'email',
            //         value: peticion.email
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'issalesrep',
            //         value: true
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'phone',
            //         value: peticion.phone
            //     });
            //
            //     ip_peticion.setValue({
            //         fieldId: 'mobilephone',
            //         value: peticion.cellphone
            //     });
            //
            //     id_registro = ip_peticion.save({
            //         enableSourcing: true,
            //         igonoreMandatoryFields: true
            //     });
            //
            //     log.audit({title: 'Se generó el empleado con id:', details: id_registro});
            //
            //
            //     if (id_registro) {
            //         var record_peticion = record.load({
            //             type: 'customrecord_efx_ip_request',
            //             id: id,
            //             isDynamic: true,
            //         });
            //
            //         record_peticion.setValue({
            //             fieldId: 'custrecord_efx_ip_status',
            //             value: 2,
            //             ignoreFieldChange: true
            //         });
            //
            //         record_peticion.setValue({
            //             fieldId: 'custrecord_efx_ip_processing',
            //             value: false,
            //             ignoreFieldChange: true
            //         });
            //
            //         record_peticion.setValue({
            //             fieldId: 'custrecord_efx_ip_employee',
            //             value: id_registro,
            //             ignoreFieldChange: true
            //         });
            //
            //         record_peticion.setValue({
            //             fieldId: 'custrecord_efx_ip_notes',
            //             value: 'El registró se generó correctamente con el id: '+id_registro,
            //             ignoreFieldChange: true
            //         });
            //
            //         record_peticion.save({
            //             enableSourcing: true,
            //             ignoreMandatoryFields: true
            //         });
            //     } else {
                    var record_peticion = record.load({
                        type: 'customrecord_efx_ip_request',
                        id: id,
                        isDynamic: true,
                    });

                    record_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_status',
                        value: 2,
                        ignoreFieldChange: true
                    });
                    record_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_processing',
                        value: false,
                        ignoreFieldChange: true
                    });

                    record_peticion.setValue({
                        fieldId: 'custrecord_efx_ip_notes',
                        value: 'No existe registro para actualizar',
                        ignoreFieldChange: true
                    });

                    record_peticion.save({
                        enableSourcing: true,
                        ignoreMandatoryFields: true
                    });
            //     }
            // } catch (error) {
            //
            //     log.error({title: 'reduce - error', details: error});
            //
            //     var record_peticion = record.load({
            //         type: 'customrecord_efx_ip_request',
            //         id: id,
            //         isDynamic: true,
            //     });
            //
            //     record_peticion.setValue({
            //         fieldId: 'custrecord_efx_ip_status',
            //         value: 3,
            //         ignoreFieldChange: true
            //     });
            //
            //     record_peticion.setValue({
            //         fieldId: 'custrecord_efx_ip_processing',
            //         value: false,
            //         ignoreFieldChange: true
            //     });
            //
            //     record_peticion.setValue({
            //         fieldId: 'custrecord_efx_ip_notes',
            //         value: JSON.parse(error),
            //         ignoreFieldChange: true
            //     });
            //     record_peticion.setValue({
            //         fieldId: 'custrecord_efx_ip_employee',
            //         value: id_registro,
            //         ignoreFieldChange: true
            //     });
            //
            //     record_peticion.save({
            //         enableSourcing: true,
            //         ignoreMandatoryFields: true
            //     });
            //
            //
            // }
        }else{
            log.audit({title:'existe',details:'existe registro'});

            try {
                var record_empleado = record.load({
                    type: record.Type.EMPLOYEE,
                    id: entity_id[0],
                    isDynamic: true,
                });

                record_empleado.setValue({
                    fieldId: 'subsidiary',
                    value: subsidiaria
                });

                record_empleado.setValue({
                    fieldId: 'firstname',
                    value: peticion.name
                });

                record_empleado.setValue({
                    fieldId: 'lastname',
                    value: peticion.lastname
                });

                record_empleado.setValue({
                    fieldId: 'custentity_efx_ip_eid',
                    value: peticion.id
                });

                record_empleado.setValue({
                    fieldId: 'email',
                    value: peticion.email
                });

                record_empleado.setValue({
                    fieldId: 'issalesrep',
                    value: true
                });
                var emp_phone = '';
                if(peticion.phone){
                    emp_phone = format.format({value: peticion.phone, type: format.Type.PHONE});
                }

                var emp_cellphone = '';
                if(peticion.cellphone){
                    emp_cellphone = format.format({value: peticion.cellphone, type: format.Type.PHONE});
                }

                log.audit({title: 'peticion.phone', details: peticion.phone});
                log.audit({title: 'peticion.cellphone', details: peticion.cellphone});
                log.audit({title: 'emp_phone', details: emp_phone});
                log.audit({title: 'emp_cellphone', details: emp_cellphone});

                record_empleado.setValue({
                    fieldId: 'phone',
                    value: emp_phone
                });

                record_empleado.setValue({
                    fieldId: 'mobilephone',
                    value: emp_cellphone
                });

                record_empleado.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

            }catch(error_update){
                log.audit({title: 'error_update', details: error_update});
            }

            // actualizar record

            var record_peticion = record.load({
                type: 'customrecord_efx_ip_request',
                id: id,
                isDynamic: true,
            });

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_status',
                value: 2,
                ignoreFieldChange: true
            });

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_processing',
                value: false,
                ignoreFieldChange: true
            });

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_employee',
                value: entity_id[0],
                ignoreFieldChange: true
            });

            record_peticion.setValue({
                fieldId: 'custrecord_efx_ip_notes',
                value: 'El registro '+entity_id[0]+' ya existe dentro de Netsuite, se actualizó',
                ignoreFieldChange: true
            });


            record_peticion.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });


        }
    }

    function summarize(summary) {

    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    }
});
