/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(['N/search','N/runtime','N/file','N/record'],

function(search,runtime,file,record) {
   
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
            var idFile = scriptObj.getParameter({name: 'custscript_efx_db_idtxt'});

            log.audit({title:'idFile',details:idFile});

                var busqueda_ventas = search.create({
                    type: 'customrecord_efx_db_txt_banco',
                    filters: [['internalid', search.Operator.ANYOF, idFile]
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
        try {
            log.audit({title: 'reduce-context', details: context});
            var data_reduce = JSON.parse(context.values[0]);
            var id = JSON.parse(context.key);

            var fileContent = file.load({
                id: data_reduce.custrecord_efx_db_txt.value
            });
            //var contenido_file =  fileContent.getContents();


            var detalleid = new Array();
            var iterator = fileContent.lines.iterator();

            log.audit({title: 'iterator', details: iterator});

            var lineas_detalle = new Array();
            iterator.each(function (line) {
                // This function updates the total by
                // adding the amount on each line to it
                log.audit({title: 'line', details: line});
                lineas_detalle.push(line.value);

                return true;
            });

            log.audit({title: 'lineas_detalle', details: lineas_detalle});

            var filtro_lineas = new Array();
            var fc = 0;
            for (var x = 0; x < lineas_detalle.length; x++) {
                fc++;
                filtro_lineas.push(['custrecord_efx_db_line', search.Operator.IS, lineas_detalle[x]]);
                if (fc < lineas_detalle.length) {
                    filtro_lineas.push('OR');
                }
            }

            var busqueda_lineas = search.create({
                type: 'customrecord_efx_db_txt_detalle',
                filters: [filtro_lineas
                    , 'and',
                    ['isinactive', search.Operator.IS, 'F']],
                columns: [
                    search.createColumn({name: 'custrecord_efx_db_line'}),

                ]
            });

            var ejecutar_lineas = busqueda_lineas.run();
            log.audit({title: 'ejecutar_lineas', details: ejecutar_lineas});
            var resultado_lineas = ejecutar_lineas.getRange(0, 100);
            log.audit({title: 'resultado_lineas', details: resultado_lineas});
            log.audit({title: 'resultado_lineas', details: resultado_lineas.length});
            var lineas_busqueda = new Array();

            for(var i=0;i<resultado_lineas.length;i++){
                lineas_busqueda[i] = resultado_lineas[i].getValue({name: 'custrecord_efx_db_line'}) || '';
            }

            log.audit({title: 'lineas_busqueda', details: lineas_busqueda});


            for(var y=0;y<lineas_detalle.length;y++){
                //iterator.each(function (line) {
                // This function updates the total by
                // adding the amount on each line to it
                log.audit({title: 'lineas_detalle[y]', details: lineas_detalle[y]});
                var existe = false;
                // var lineValues = line.value.split(',');
                // var lineAmount = parseFloat(lineValues[1]);
                // if (!lineAmount)
                //     throw error.create({
                //         name: 'INVALID_INVOICE_FILE',
                //         message: 'Invoice file contained non-numeric value for total: ' + lineValues[1]
                //     });
                //
                // total += lineAmount;
                log.audit({title: 'lineas_busqueda.length', details: lineas_busqueda.length});
                for(var x=0;x<lineas_busqueda.length;x++){
                    if(lineas_busqueda[x]==lineas_detalle[y]){
                        log.audit({title: 'existe', details: existe});
                        existe = true;
                        break;
                    }
                }
                log.audit({title: 'existe', details: existe});

                var abono = true;
                try{
                    //var line_split = line.value.split('+');
                    var line_split = lineas_detalle[y].split('+');

                    var importe_text = line_split[1].substr(0,14);
                    var importe_decimal = importe_text.substr(0,12)+'.'+importe_text.substr(12,2);
                    var importe = parseFloat(importe_decimal);
                    //var referencia =  line_split[1].substr(28,8);
                    var referencia =  line_split[1].substr(36,40);

                }catch (error_line) {
                    log.audit({title: 'error_line', details: error_line});
                    //var line_split = line.value.split('-');
                    var line_split = lineas_detalle[y].split('-');
                    var importe_text = line_split[1].substr(0,14);
                    var importe_decimal = importe_text.substr(0,12)+'.'+importe_text.substr(12,2);
                    var importe = parseFloat(importe_decimal);
                    //var referencia =  line_split[1].substr(28,8);
                    var referencia =  line_split[1].substr(36,40);
                    abono = false;
                }




                var detalle_record = record.create({
                    type: 'customrecord_efx_db_txt_detalle',
                    isDynamic: true
                });

                detalle_record.setValue({
                    fieldId: 'custrecord_efx_db_tb',
                    value: id
                });

                detalle_record.setValue({
                    fieldId: 'custrecord_efx_db_line',
                    //value: line.value
                    value: lineas_detalle[y]
                });

                detalle_record.setValue({
                    fieldId: 'custrecord_efx_db_pago',
                    value: importe
                });

                // detalle_record.setValue({
                //     fieldId: 'custrecord_efx_db_line',
                //     value: line.value
                // });

                detalle_record.setValue({
                    fieldId: 'custrecord_efx_db_reference',
                    value: referencia
                });

                detalle_record.setValue({
                    fieldId: 'custrecord_efx_db_abono',
                    value: abono
                });

                if(abono==false) {
                    detalle_record.setValue({
                        fieldId: 'custrecord_efx_db_processed',
                        value: true
                    });

                    detalle_record.setValue({
                        fieldId: 'custrecord_efx_db_notes',
                        value: 'Procesado!'
                    });
                }else{
                    detalle_record.setValue({
                        fieldId: 'custrecord_efx_db_notes',
                        value: 'Listo para procesar!'
                    });
                }
                if(existe==true){
                    detalle_record.setValue({
                        fieldId: 'custrecord_efx_db_processed',
                        value: true
                    });

                    detalle_record.setValue({
                        fieldId: 'custrecord_efx_db_notes',
                        value: 'Esta linea se habia cargado anteriormente.'
                    });
                }


                var detalle_id = detalle_record.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });

                detalleid.push(detalle_id);
                //return true;
                //});
            }


            log.audit({title: 'detalleid', details: detalleid});

        }catch(error_reduce){
            log.audit({title:'Error reduce',details:error_reduce});
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
