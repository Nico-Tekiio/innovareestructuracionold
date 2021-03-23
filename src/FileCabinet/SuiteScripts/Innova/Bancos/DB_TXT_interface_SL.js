/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/runtime','N/file','N/redirect','N/runtime','N/record','N/url','N/task','N/search'],
/**
 * @param{serverWidget} serverWidget
 */
function(serverWidget,runtime,file,redirect,runtime,record,urlMod,task,search) {
   
    /**
     * Definition of the Suitelet script trigger point.
     *
     * @param {Object} context
     * @param {ServerRequest} context.request - Encapsulation of the incoming request
     * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
     * @Since 2015.2
     */
    function onRequest(context) {

        try{
        var params = context.request.parameters;
        var process = '';
        var proceso = 0;
        var userObj = runtime.getCurrentUser();
        var scriptObj = runtime.getCurrentScript();
        folder = scriptObj.getParameter({name: 'custscript_efx_db_folder'});
        //process=params.process;

        log.audit({title:'folderid',details:folder});
        log.audit({title:'context',details:context});
        log.audit({title:'params',details:params});


        if(context.request.files['custpage_document']) {
            var busqueda_archivo = search.create({
                type: search.Type.FOLDER,
                filters: [
                    ['internalid', search.Operator.IS, folder]
                    , 'and',
                    ['file.name', search.Operator.IS, context.request.files['custpage_document'].name]
                ],
                columns: [
                    search.createColumn({name: 'internalid'}),
                ]
            });
            var ejecutar_archivo = busqueda_archivo.run();
            log.audit({title: 'ejecutar_archivo', details: ejecutar_archivo});
            var resultado_archivo = ejecutar_archivo.getRange(0, 100);
            log.audit({title: 'resultado_archivo', details: resultado_archivo});
            log.audit({title: 'resultado_archivo', details: resultado_archivo.length});


            log.audit({title: 'tipo', details: context.request.files['custpage_document'].fileType});


            if(resultado_archivo.length<=0) {
                if (context.request.files['custpage_document'].fileType == 'PLAINTEXT') {
                    log.audit({title: 'folderid', details: folder});
                    //var archivo = context.request.parameters.custpage_document;
                    var documento = context.request.files['custpage_document'];
                    documento.name = context.request.files['custpage_document'].name;
                    documento.folder = folder;
                    var id_doc = documento.save();

                    log.audit({title: 'id_doc', details: id_doc});

                    var fileContent = file.load({
                        id: id_doc
                    });
                    var contenido_file = fileContent.getContents();

                    log.audit({title: 'contenido_file', details: contenido_file});

                    if (contenido_file) {
                        process = getFile(context.request.files['custpage_document'].name);
                        redirect.toSuitelet({
                            scriptId: 'customscript_efx_db_interface_sl',
                            deploymentId: 'customdeploy_efx_db_interface_sl',
                            parameters: {'process': process, 'archivo': id_doc, 'empleado': userObj.id}
                        });
                        proceso = 1;
                    } else {
                        process = 'Vacio';
                        redirect.toSuitelet({
                            scriptId: 'customscript_efx_db_interface_sl',
                            deploymentId: 'customdeploy_efx_db_interface_sl',
                            parameters: {'process': process}
                        });
                    }


                } else {
                    process = 'F';
                    redirect.toSuitelet({
                        scriptId: 'customscript_efx_db_interface_sl',
                        deploymentId: 'customdeploy_efx_db_interface_sl',
                        parameters: {'process': process}
                    });
                }
            }else{
                process = 'existe';
                redirect.toSuitelet({
                    scriptId: 'customscript_efx_db_interface_sl',
                    deploymentId: 'customdeploy_efx_db_interface_sl',
                    parameters: {'process': process}
                });
            }
        }else{
            process=params.process;
        }

            if(process=='process' && proceso==0){

                var dataBancos = crearTXT(params.archivo,params.empleado);
                log.audit({title:'dataBancos',details:dataBancos});
                var detalleBancos = crearTXTdetalle(dataBancos,context.request.files['custpage_document']);
                log.audit({title:'detalleBancos',details:detalleBancos});
            }

            if(process=='processed'){
                var idregistro = params.registro;

                var record_peticion = record.load({
                    type: 'customrecord_efx_db_txt_banco',
                    id: idregistro,
                    isDynamic: true,
                });

                record_peticion.setValue({
                    fieldId: 'custrecord_efx_db_processing',
                    value: true,
                    ignoreFieldChange: true
                });

                record_peticion.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                log.audit({title:'process',details:process});
                var processedData = crearDeBoton(idregistro);
                log.audit({title:'processedData',details:processedData});

            }



        //Crear pantalla
        var form = serverWidget.createForm({ title: 'Archivo TXT' });

        form.clientScriptModulePath = './DB_TXT_interface_CS.js';
        form.addSubmitButton({label: 'Procesar'});
        var document_field = form.addField({
            id: 'custpage_document',
            type: serverWidget.FieldType.FILE,
            label: 'Archivo TXT',
        });
        document_field.isMandatory = true;

        context.response.writePage(form);

        }
        catch(e){
            log.error({title: "onRequest", details: e});
            redirect.toSuitelet({
                scriptId: 'customscript_efx_db_interface_sl' ,
                deploymentId: 'customdeploy_efx_db_interface_sl',
                parameters: {'process':'F'}
            });
        }
    }

    function crearDeBoton(idregistro) {
        var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
        mrTask.scriptId = 'customscript_efx_db_generate_pay_mr';
        mrTask.deploymentId = 'customdeploy_efx_db_generate_pay_mr';
        mrTask.params = {custscript_efx_db_rec_id: idregistro};
        log.audit({title:'parametros',details:mrTask.params});

        var mrTaskId = mrTask.submit();

        return mrTaskId;
    }


    function crearTXTdetalle(TXTBanco,archivo) {

        var mrTask = task.create({taskType: task.TaskType.MAP_REDUCE});
        mrTask.scriptId = 'customscript_efx_db_generate_txt_rec_mr';
        mrTask.deploymentId = 'customdeploy_efx_db_generate_txt_rec_mr';
        mrTask.params = {custscript_efx_db_idtxt: TXTBanco};
        log.audit({title:'parametros',details:mrTask.params});

        var mrTaskId = mrTask.submit();

        return mrTaskId;


        // var detalleid = new Array();
        // var iterator = archivo.lines.iterator();
        //
        // log.audit({title:'iterator',details:iterator});
        //
        // iterator.each(function (line)
        // {
        //     // This function updates the total by
        //     // adding the amount on each line to it
        //     log.audit({title:'line',details:line});
        //     // var lineValues = line.value.split(',');
        //     // var lineAmount = parseFloat(lineValues[1]);
        //     // if (!lineAmount)
        //     //     throw error.create({
        //     //         name: 'INVALID_INVOICE_FILE',
        //     //         message: 'Invoice file contained non-numeric value for total: ' + lineValues[1]
        //     //     });
        //     //
        //     // total += lineAmount;
        //
        //
        //
        // var detalle_record = record.create({
        //     type: 'customrecord_efx_db_txt_detalle',
        //     isDynamic: true
        // });
        //
        // detalle_record.setValue({
        //     fieldId: 'custrecord_efx_db_tb',
        //     value: TXTBanco
        // });
        //
        // detalle_record.setValue({
        //     fieldId: 'custrecord_efx_db_line',
        //     value: line.value
        // });
        //
        // detalle_record.setValue({
        //     fieldId: 'custrecord_efx_db_notes',
        //     value: 'Listo para procesar!'
        // });
        // var detalle_id = detalle_record.save({
        //     enableSourcing: true,
        //     ignoreMandatoryFields: true
        // });
        //
        // detalleid.push(detalle_id);
        //     return true;
        // });
        //
        // return detalleid;
    }

    function crearTXT(archivo,empleado) {

        var txt_record = record.create({
            type: 'customrecord_efx_db_txt_banco',
            isDynamic: true
        });

        txt_record.setValue({
            fieldId: 'custrecord_efx_db_txt',
            value: archivo
        });

        txt_record.setValue({
            fieldId: 'custrecord_efx_db_eployee',
            value: empleado
        });

        txt_record.setValue({
            fieldId: 'custrecord_efx_db_pending',
            value: 1
        });
        var txtid = txt_record.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        return txtid;

    }

    function getFile(uploadfile) {
        log.audit({title:'Se creo el archivo',details:uploadfile});

        return 'process';
    }


    function getFile2(uploadfile) {
        try{
            var iterator = uploadfile.lines.iterator();
            var files = [];
            var auxlines = [];
            var excededarray = [];
            var totalcount = 0;
            var count = 0;
            var totalDebit = 0;
            var totalCredit = 0;
            var cabecera = "";
            var lastbalanceposition = 0;
            var components = [];

            iterator.each(function (content) {
                // log.audit("content["+count+"]", content);
                var auxnewline = "";
                if(totalcount == 0){
                    cabecera = content.value +"\n";
                    log.audit("cabecera", cabecera);
                    totalcount++;
                    return true;
                }
                /*if(excededarray.length){
                    log.audit("excededarray", excededarray);
                    for(var x = excededarray.length - 1; x >= 0; x--) {
                        auxlines.push(excededarray[x]);
                        count++;
                    }
                    excededarray = [];
                }*/

                count++;
                components = content.value.split(",");
                totalCredit += components[7] * 1;
                totalDebit += components[6] * 1;

                auxlines.push(content.value);
                //auxlines.push(auxnewline);
                // log.audit("components", components);
                //lastbalanceposition = (totalCredit == totalDebit)? count-1: lastbalanceposition;

                if(count >= 9999){
                    var difference = totalDebit - totalCredit;
                    difference = difference.toFixed(2);
                    difference = parseFloat(difference);
                    var lastline = "";
                    lastline += components[0]+",";
                    lastline += components[1]+",";
                    lastline += "Cuenta puente,";
                    lastline += components[3]+",";
                    lastline += components[4]+",";
                    lastline += "1844,";

                    if(difference < 0){
                        lastline += difference * -1+",";
                        lastline += 0;
                    }
                    else {
                        lastline += 0+",";
                        lastline += difference;
                    }

                    auxlines.push(lastline);

                    totalCredit = 0;
                    totalDebit = 0;
                    files.push(auxlines);
                    count = 0;
                    auxlines = [];
                }
                totalcount++;
                return true;
            });

            if(count > 0){
                files.push(auxlines);

                var difference = totalDebit - totalCredit;
                difference = difference.toFixed(2);
                difference = parseFloat(difference);
                var lastline = "";
                lastline += components[0]+",";
                lastline += components[1]+",";
                lastline += "Cuenta puente,";
                lastline += components[3]+",";
                lastline += components[4]+",";
                lastline += "1844,";

                if(difference < 0){
                    lastline += difference * -1+",";
                    lastline += 0;
                }
                else {
                    lastline += 0+",";
                    lastline += difference;
                }

                auxlines.push(lastline);
            }

            log.audit("files[0]", files);

            var fileids = [];

            for(var i in files){
                var content = cabecera;
                for(var j in files[i]){
                    var line = files[i][j];
                    content += line + "\n";
                }
                log.audit("content", content);
                var fileObj = file.create({
                    name: date+'-'+i+'.csv',
                    fileType: file.Type.CSV,
                    contents: content,
                    encoding: file.Encoding.UTF8,
                    folder: idfolder,
                });
                var fileid = fileObj.save();
                fileids.push(fileid);
                log.audit("fileid", fileid);
            }
            log.audit("fileids", fileids);
            var mrTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: 'customscript_efx_csv_import_files_ss',
                deploymentId: 'customdeploy_efx_csv_import_files_ss',
                params: {custscript_efx_files: JSON.stringify(fileids)}
            });
            var idTask = mrTask.submit();
            log.audit("idTask", idTask);
            return 'T';

        }
        catch (e) {
            log.error({title: "getFile", details: e});
            return 'F';
        }
    }


    return {
        onRequest: onRequest
    };
    
});
