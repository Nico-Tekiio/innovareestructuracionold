function customizeGlImpact(transactionRecord, standardLines, customLines, book) {
    try{
        nlapiLogExecution('DEBUG', 'type', transactionRecord.getRecordType());
        var tipo = transactionRecord.getRecordType();
        var reclasificar = transactionRecord.getFieldValue('custbody_efx_ip_glimpact');
        if(reclasificar=='T') {

            //por si las clases son mandatorias
            var context = nlapiGetContext();
            var makeClassesMandatory = context.getPreference('classmandatory');
            var allowPerLineClasses = context.getPreference('classesperline');
            var classId = transactionRecord.getFieldValue('class');
            if(classId){
                classId = parseInt(classId);
            }
            nlapiLogExecution('DEBUG', 'makeClassesMandatory', JSON.stringify(makeClassesMandatory));
            nlapiLogExecution('DEBUG', 'allowPerLineClasses', JSON.stringify(allowPerLineClasses));

            //Se crea busqueda del tipo de registro IP - Cuenta Anticipo
            var filters = new Array();
            filters[0] = new nlobjSearchFilter('isinactive', null, 'is', 'F');

            var columns = new Array();
            columns[0] = new nlobjSearchColumn('custrecord_efx_ip_account_deposit');
            columns[1] = new nlobjSearchColumn('custrecord_efx_ip_depositaccount');
            columns[2] = new nlobjSearchColumn('custrecord_efx_ip_cacolegiatura');
            columns[3] = new nlobjSearchColumn('custrecord_efx_fe_otherdeposit');

            var search = nlapiSearchRecord('customrecord_efx_ip_accout', null, filters, columns);

            var cuenta_anticipo_ins = parseInt(search[0].getValue('custrecord_efx_ip_account_deposit')) || '';
            var cuenta_defecto = parseInt(search[0].getValue('custrecord_efx_ip_depositaccount')) || '';
            var cuenta_anticipo_col = parseInt(search[0].getValue('custrecord_efx_ip_cacolegiatura')) || '';
            var otros_depositos = parseInt(search[0].getValue('custrecord_efx_fe_otherdeposit')) || '';

            nlapiLogExecution('DEBUG', 'cuenta_anticipo_ins', JSON.stringify(cuenta_anticipo_ins));

            nlapiLogExecution('DEBUG', 'cuenta_anticipo_col', JSON.stringify(cuenta_anticipo_col));


            //Fin de la busqueda del tipo de registro

            //Inicia la reclasificación

            if(tipo=='customerpayment' || tipo=='depositapplication'){
                var numberOfDeposit = transactionRecord.getLineItemCount('deposit');
                for (var x = 1; x <= numberOfDeposit; x++) {
                    if (transactionRecord.getLineItemValue('deposit', 'apply', x) == 'T') {
                        var internalid = transactionRecord.getLineItemValue('deposit', 'doc', x) || '';
                    }
                }

                //Busqueda de datos de deposito

                var filters = new Array();
                filters.push(new nlobjSearchFilter('internalid',null,'anyof',internalid));
                //Se generan las columnas de datos a usar de las transacciones
                var columns = new Array();
                columns.push(new nlobjSearchColumn('custbody_efx_ip_deposittype'));
                columns.push(new nlobjSearchColumn('custbody_efx_ip_glimpact_desc'));

                //Se genera una busqueda de las transacciones aplicadas
                var search = nlapiSearchRecord('transaction', null,filters,columns);

                for(var x=0;x<search.length;x++){
                    var deposit_tipo = search[x].getValue('custbody_efx_ip_deposittype') || '';
                    var deposit_descuento = search[x].getValue('custbody_efx_ip_glimpact_desc') || '';
                }
                //

                var monto = transactionRecord.getFieldValue('applied');
                nlapiLogExecution('DEBUG', 'depositapplication', 'depositapplication');

                if(!deposit_tipo){
                    if (otros_depositos && cuenta_defecto) {
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(otros_depositos);
                        newLine.setDebitAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                        /*Creacion de Registro del Credit*/
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_defecto);
                        newLine.setCreditAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                    }
                }


                if(deposit_tipo==1){

                    if(deposit_descuento=='T'){
                        if (cuenta_anticipo_col && cuenta_defecto) {
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_anticipo_col);
                            newLine.setDebitAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }

                            /*Creacion de Registro del Credit*/
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_defecto);
                            newLine.setCreditAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }

                        }
                    }else {

                        if (cuenta_anticipo_ins && cuenta_defecto) {
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_anticipo_ins);
                            newLine.setDebitAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }

                            /*Creacion de Registro del Credit*/
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_defecto);
                            newLine.setCreditAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }

                        }
                    }
                }


                if(deposit_tipo==2){
                    if (cuenta_anticipo_col && cuenta_defecto) {
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_anticipo_col);
                        newLine.setDebitAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                        /*Creacion de Registro del Credit*/
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_defecto);
                        newLine.setCreditAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                    }
                }
            }

            // if(tipo=='depositapplication'){
            //     var numberOfDeposit = transactionRecord.getLineItemCount('deposit');
            //     for (var x = 1; x <= numberOfDeposit; x++) {
            //         if (transactionRecord.getLineItemValue('apply', 'apply', x) == 'T') {
            //             var internalid = transactionRecord.getLineItemValue('apply', 'doc', x) || '';
            //         }
            //     }
            //
            //     //Busqueda de datos de deposito
            //
            //     var filters = new Array();
            //     filters.push(new nlobjSearchFilter('internalid',null,'anyof',internalid));
            //     //Se generan las columnas de datos a usar de las transacciones
            //     var columns = new Array();
            //     columns.push(new nlobjSearchColumn('custbody_efx_ip_deposittype'));
            //     columns.push(new nlobjSearchColumn('custbody_efx_ip_glimpact_desc'));
            //
            //     //Se genera una busqueda de las transacciones aplicadas
            //     var search = nlapiSearchRecord('transaction', null,filters,columns);
            //
            //     for(var x=0;x<search.length;x++){
            //         var deposit_tipo = search[x].getValue('custbody_efx_ip_deposittype') || '';
            //         var deposit_descuento = search[x].getValue('custbody_efx_ip_glimpact_desc') || '';
            //     }
            //     //
            //
            //     var monto = transactionRecord.getFieldValue('applied');
            //     nlapiLogExecution('DEBUG', 'depositapplication', 'depositapplication');
            //
            //     if(deposit_tipo==1){
            //
            //         if(deposit_descuento=='T'){
            //             if (cuenta_anticipo_col && cuenta_deposito_col) {
            //                 var newLine = customLines.addNewLine();
            //                 newLine.setAccountId(cuenta_anticipo_col);
            //                 newLine.setDebitAmount(monto);
            //                 newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //                 /*Creacion de Registro del Credit*/
            //                 var newLine = customLines.addNewLine();
            //                 newLine.setAccountId(cuenta_deposito_col);
            //                 newLine.setCreditAmount(monto);
            //                 newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //             }
            //         }else {
            //
            //             if (cuenta_anticipo_ins && cuenta_deposito_ins) {
            //                 var newLine = customLines.addNewLine();
            //                 newLine.setAccountId(cuenta_anticipo_ins);
            //                 newLine.setDebitAmount(monto);
            //                 newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //                 /*Creacion de Registro del Credit*/
            //                 var newLine = customLines.addNewLine();
            //                 newLine.setAccountId(cuenta_deposito_ins);
            //                 newLine.setCreditAmount(monto);
            //                 newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //             }
            //         }
            //     }
            //
            //
            //     if(deposit_tipo==2){
            //         if (cuenta_anticipo_col && cuenta_deposito_col) {
            //             var newLine = customLines.addNewLine();
            //             newLine.setAccountId(cuenta_anticipo_col);
            //             newLine.setDebitAmount(monto);
            //             newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //             /*Creacion de Registro del Credit*/
            //             var newLine = customLines.addNewLine();
            //             newLine.setAccountId(cuenta_deposito_col);
            //             newLine.setCreditAmount(monto);
            //             newLine.setMemo('Movimiento a cuenta de anticipo');
            //
            //         }
            //     }
            //
            //
            // }

            if(tipo=='customerdeposit'){
                var tran_tipo = transactionRecord.getFieldValue('custbody_efx_ip_deposittype');
                var descuento = transactionRecord.getFieldValue('custbody_efx_ip_glimpact_desc');
                var monto = transactionRecord.getFieldValue('payment');
                nlapiLogExecution('DEBUG', 'customerdeposit', 'customerdeposit');

                if(!tran_tipo){
                    if (otros_depositos && cuenta_defecto) {
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_defecto);
                        newLine.setDebitAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                        /*Creacion de Registro del Credit*/
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(otros_depositos);
                        newLine.setCreditAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }
                    }
                }

                if(tran_tipo==1){

                    if(descuento=='T'){
                        if (cuenta_anticipo_col && cuenta_defecto) {
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_defecto);
                            newLine.setDebitAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                    newLine.setClassId(29);
                            }

                            /*Creacion de Registro del Credit*/
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_anticipo_col);
                            newLine.setCreditAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                    newLine.setClassId(29);
                            }
                        }
                    }else{
                        if (cuenta_anticipo_ins && cuenta_defecto) {
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_defecto);
                            newLine.setDebitAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }

                            /*Creacion de Registro del Credit*/
                            var newLine = customLines.addNewLine();
                            newLine.setAccountId(cuenta_anticipo_ins);
                            newLine.setCreditAmount(monto);
                            newLine.setMemo('Movimiento a cuenta de anticipo');
                            if (makeClassesMandatory || allowPerLineClasses) {
                                newLine.setClassId(29);
                            }
                        }
                    }
                }

                if(tran_tipo==2){
                    if (cuenta_anticipo_col && cuenta_defecto) {
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_defecto);
                        newLine.setDebitAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                        /*Creacion de Registro del Credit*/
                        var newLine = customLines.addNewLine();
                        newLine.setAccountId(cuenta_anticipo_col);
                        newLine.setCreditAmount(monto);
                        newLine.setMemo('Movimiento a cuenta de anticipo');
                        if (makeClassesMandatory || allowPerLineClasses) {
                            newLine.setClassId(29);
                        }

                    }
                }
            }


        }

    }catch(e){
        nlapiLogExecution('ERROR', 'Error: ', JSON.stringify(e));
    }
}

function getClassForItem(){

}
