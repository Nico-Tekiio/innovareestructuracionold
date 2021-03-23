/**
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *@Author        Marco Ramirez
 *@Created       02-03-2020
 *@ScriptName    IP - Hide Fields UE
 *@Filename      IP_Hide_Fields_UE.js
 *@ScriptID      customscript_efx_ip_hf_ue
 *@modifications
 *  Date          Author            Version     Remarks
 *  0000-00-00    Author                        Edit
 *
 */
define(['N/ui/serverWidget'], function(serverWidget) {

    function beforeLoad(context) {

        var registro = context.form;
        var registro_campo = context.newRecord;

        var ip_employee = registro.getField({id: 'custrecord_efx_ip_employee'});
        var ip_customer = registro.getField({id: 'custrecord_efx_ip_customer'});
        var ip_transaction = registro.getField({id: 'custrecord_efx_ip_trans'});

        if (context.type == context.UserEventType.VIEW || context.type == context.UserEventType.EDIT) {
            //tipo de registro puede ser empleado o venta
            var tipo_registro = registro_campo.getText('custrecord_efx_ip_tipe');

            if (tipo_registro == 'Venta') {
                ip_employee.updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.HIDDEN
                });
            }

            if (tipo_registro == 'Empleado') {

                ip_customer.updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.HIDDEN
                });
                ip_transaction.updateDisplayType({
                    displayType : serverWidget.FieldDisplayType.HIDDEN
                });
            }

        }
    }
    return {
        beforeLoad: beforeLoad,
    }
});
