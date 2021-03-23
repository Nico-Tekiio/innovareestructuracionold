/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget','N/record'],
/**
 * @param{serverWidget} serverWidget
 */
function(serverWidget) {
   
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type
     * @param {Form} scriptContext.form - Current form
     * @Since 2015.2
     */
    function beforeLoad(scriptContext,record) {
        var rec = scriptContext.newRecord;
        var recID = rec.id;
        var status = rec.getValue('custrecord_efx_db_pending');
        var processing = rec.getValue('custrecord_efx_db_processing');

        log.audit({title:'recID', details:recID});
        log.audit({title:'processing', details:processing});


        var form = scriptContext.form;
        form.clientScriptModulePath = "./DB_process_TXT_CS.js";

        if(status==3 && processing==false){
            form.addButton({
                id: "custpage_btn_reprocesar",
                label: "Reprocesar",
                functionName: "reprocesar(" + recID + ")"
            });
        }


    }


    return {
        beforeLoad: beforeLoad
    };
    
});
