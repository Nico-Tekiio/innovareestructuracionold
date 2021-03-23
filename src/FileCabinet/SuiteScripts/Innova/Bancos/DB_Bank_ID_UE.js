/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/record','N/search'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 */
function(record,search) {

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function beforeSubmit(scriptContext) {



    }

    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {

        var rec = scriptContext.newRecord;
        var recID = rec.id;

        log.audit({title:'recID',details:recID});

        var subcliente = rec.getValue('parent');
        var prosp_id = rec.getValue('custentity_efx_ip_eid');
        var pre_referencia = '';
        if(prosp_id.length<9){
            pre_referencia = prosp_id;
            for(var x=prosp_id.length;x<9;x++){
                pre_referencia = '0'+pre_referencia;
            }
        }
        log.audit({title:'pre_referencia',details:pre_referencia});

        log.audit({title:'subcliente',details:subcliente});

        if(subcliente) {
            //Se busca configuracion para prefijo por articulo
            var busqueda_config = search.create({
                type: 'customrecord_efx_db_txt_config',
                filters: [['custrecord_efx_db_ref_s', search.Operator.ISNOTEMPTY, '']
                    , 'and',
                    ['isinactive', search.Operator.IS, 'F']],
                columns: [
                    search.createColumn({name: 'internalid'}),
                    search.createColumn({name: 'custrecord_efx_db_ref_s'}),
                    search.createColumn({name: 'custrecord_efx_db_ref_i'}),
                    search.createColumn({name: "type", join: "CUSTRECORD_EFX_DB_REF_I"}),
                ]
            });

            var ejecutar = busqueda_config.run();
            var resultado = ejecutar.getRange(0, 100);
            var reference = new Array();
            var item_config = new Array();
            var item_type = new Array();
            for (var x = 0; x < resultado.length; x++) {
                reference[x] = resultado[x].getValue({name: 'custrecord_efx_db_ref_s'}) || '';
                item_config[x] = resultado[x].getValue({name: 'custrecord_efx_db_ref_i'}) || '';
                item_type[x] = resultado[x].getValue({name: "type", join: "CUSTRECORD_EFX_DB_REF_I"}) || '';
            }

            //Se busca referencia por cliente
            var busqueda_referencia = search.create({
                type: 'customrecord_efx_db_txt_referencia',
                filters: [['custrecord_efx_db_ref_customer', search.Operator.IS, recID]],
                columns: [
                    search.createColumn({name: 'custrecord_efx_db_gen_id'}),
                    search.createColumn({name: 'custrecord_efx_db_ref_ref'}),
                    search.createColumn({name: 'custrecord_efx_db_ref_customer'}),
                    search.createColumn({name: 'custrecord_efx_db_ref_item'}),
                ]
            });
            var ejecutar_ref = busqueda_referencia.run();
            var resultado_ref = ejecutar_ref.getRange(0, 100);
            var item_ref = new Array();

            for (var r = 0; r < resultado_ref.length; r++) {
                item_ref[r] = resultado_ref[r].getValue({name: 'custrecord_efx_db_ref_item'});
            }

            var newReference = new Array();
            var newItems = new Array();
            var newType = new Array();

            var n = 0;

            for (var i = 0; i < item_config.length; i++) {
                var repetido = false;
                for (var y = 0; y < item_ref.length; y++) {
                    if (item_config[i] == item_ref[y]) {
                        repetido = true;
                    }
                }
                if (repetido == false) {
                    newReference[n] = reference[i]+pre_referencia;
                    newItems[n] = item_config[i];
                    newType[n] = item_type[i];
                    n++;
                }
            }

            log.audit({title: 'newReference', details: newReference});
            log.audit({title: 'newItems', details: newItems});


            for (var t = 0; t < newItems.length; t++) {
                var referencia = algoritmoSantander(newReference[t]);
                log.audit({title: 'referencia', details: referencia});

                var referencias_alumno = crearReferenciasRecord(referencia, newItems[t], recID, newType[t],newReference[t]);

                log.audit({title: 'Se creo el registro', details: referencias_alumno});

            }


        }
    }

    function crearReferenciasRecord(referencia,articulo,alumno,tipo,preref) {

        log.audit({title:'tipo',details:tipo});

        var tipo_articulo = '';

        switch (tipo) {
            case 'Assembly':
                tipo_articulo = record.Type.ASSEMBLY_ITEM;
                break;
            case 'Description':
                tipo_articulo = record.Type.DESCRIPTION_ITEM;
                break;
            case 'Discount':
                tipo_articulo = record.Type.DISCOUNT_ITEM;
                break;
            case 'GiftCert':
                tipo_articulo = record.Type.GIFT_CERTIFICATE_ITEM;
                break;
            case 'InvtPart':
                tipo_articulo = record.Type.INVENTORY_ITEM;
                break;
            case 'Group':
                tipo_articulo = record.Type.ITEM_GROUP;
                break;
            case 'Kit':
                tipo_articulo = record.Type.KIT_ITEM;
                break;
            case 'Markup':
                tipo_articulo = record.Type.MARKUP_ITEM;
                break;
            case 'NonInvtPart':
                tipo_articulo = record.Type.NON_INVENTORY_ITEM;
                break;
            case 'OthCharge':
                tipo_articulo = record.Type.OTHER_CHARGE_ITEM;
                break;
            case 'Payment':
                tipo_articulo = record.Type.PAYMENT_ITEM;
                break;
            case 'Service':
                tipo_articulo = record.Type.SERVICE_ITEM;
                break;
            case 'Subtotal':
                tipo_articulo = record.Type.SUBTOTAL_ITEM;
                break;
        }


        var articulo_record = record.load({
            type: tipo_articulo,
            id: articulo,
            isDynamic: true,
        });


        var nombre_item = articulo_record.getText({
            fieldId: 'itemid'
        });



        var ref_record = record.create({
           type: 'customrecord_efx_db_txt_referencia',
           isDynamic: true
        });

        ref_record.setValue({
            fieldId: 'custrecord_efx_db_ref_ref',
            value: referencia
        });

        ref_record.setValue({
            fieldId: 'custrecord_efx_db_ref_customer',
            value: alumno
        });

        ref_record.setValue({
            fieldId: 'custrecord_efx_db_ref_item',
            value: articulo
        });

        // ref_record.setValue({
        //     fieldId: 'custrecord_efx_db_gen_id',
        //     value: nombre_item[0]+articulo+alumno
        // });

        ref_record.setValue({
            fieldId: 'custrecord_efx_db_gen_id',
            value: preref
        });

        var recordId = ref_record.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });

        log.audit({title:'recordId',details:recordId});
        return recordId;

    }

    function algoritmoSantander(reference) {

            var constante = 330;
            var factor_fijo = 1;
            var divisor = 97;

            var referencia_original = reference;
            var referencia = reference;
            log.audit({title:'referencia',details:referencia});
            var tam_reference = referencia.length;
            log.audit({title:'tam_reference',details:tam_reference});
            for(var i=0;i<tam_reference;i++){
                var letra = referencia.charAt(i);

                switch (letra) {
                    case 'A': case 'a': case 'J': case 'j': case 'S': case 's':
                        referencia = referencia.replace(letra,'1');
                        break;
                    case 'B': case 'b': case 'K': case 'k': case 'T': case 't':
                        referencia = referencia.replace(letra,'2');
                        break;
                    case 'C': case 'c': case 'L': case 'l': case 'U': case 'u':
                        referencia = referencia.replace(letra,'3');
                        break;
                    case 'D': case 'd': case 'M': case 'm': case 'V': case 'v':
                        referencia = referencia.replace(letra,'4');
                        break;
                    case 'E': case 'e': case 'N': case 'n': case 'W': case 'w':
                        referencia = referencia.replace(letra,'5');
                        break;
                    case 'F': case 'f': case 'O': case 'o': case 'X': case 'x':
                        referencia = referencia.replace(letra,'6');
                        break;
                    case 'P': case 'p': case 'G': case 'g': case 'Y': case 'y':
                        referencia = referencia.replace(letra,'7');
                        break;
                    case 'H': case 'h': case 'Q': case 'q': case 'Z': case 'z':
                        referencia = referencia.replace(letra,'8');
                        break;
                    case 'I': case 'i': case 'R': case 'r':
                        referencia = referencia.replace(letra,'9');
                        break;
                }
            }
        log.audit({title:'referencia',details:referencia});


            var poderadores = new Array(23,19,17,13,11);
            var array_ponderado = new Array();
            var count = 0;

            for(var x=0;x<tam_reference;x++){

                if(poderadores.length-1<count){
                    count=0;
                }
                array_ponderado[x]=poderadores[count];
                count++;
            }

            log.audit({title:'array_ponderado',details:array_ponderado});

            var referencia_multiplicada = new Array();
            var referencia_suma = 0;
            for(var y=0;y<tam_reference;y++){
                referencia_multiplicada[y]=parseInt(referencia[y])*parseInt(array_ponderado[y]);
                referencia_suma = referencia_suma+referencia_multiplicada[y];
            }

        log.audit({title:'referencia_multiplicada',details:referencia_multiplicada});
        log.audit({title:'referencia_suma',details:referencia_suma});

        var suma_constante = referencia_suma+constante;

        log.audit({title:'suma_constante',details:suma_constante});

        var division_referencia = parseInt(suma_constante) % divisor;

        log.audit({title:'division_referencia',details:division_referencia});

        var resultado_referencia = division_referencia+factor_fijo;

        log.audit({title:'resultado_referencia',details:resultado_referencia});

        var referencia_final = '';
        if(resultado_referencia<10){
            referencia_final = referencia_original+'0'+resultado_referencia;
        }else{
            referencia_final = referencia_original+''+resultado_referencia;
        }

        log.audit({title:'referencia_final',details:referencia_final});


            return referencia_final;
    }

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
    
});
