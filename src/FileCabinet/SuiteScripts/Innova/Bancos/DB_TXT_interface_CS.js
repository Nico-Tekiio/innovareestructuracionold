/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/ui/message'],
/**
 * @param{url} url
 */
function(message) {
    
    /**
     * Function to be executed after page is initialized.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
     *
     * @since 2015.2
     */
    function pageInit(scriptContext) {

        console.log("asdad");
        var urlTxt = window.location.href;
        var urlObject = new URL(urlTxt);
        var process = urlObject.searchParams.get("process");

        console.log("process", process);
        if(process == 'process'){
            var myMsg = message.create({
                title: "Archivos cargados",
                message: "El archivo ha sido registrado correctamente.",
                type: message.Type.CONFIRMATION
            });

            myMsg.show();
        }
        else if(process == 'F'){
            var myMsg = message.create({
                title: "Ha ocurrido un error",
                message: "Se debe cargar un archivo en formato TXT",
                type: message.Type.ERROR
            });

            myMsg.show();
        }
        else if(process == 'Vacio'){
            var myMsg = message.create({
                title: "Ha ocurrido un error",
                message: "El archivo TXT no debe estar vacio.",
                type: message.Type.ERROR
            });

            myMsg.show();
        }
        else if(process == 'existe'){
            var myMsg = message.create({
                title: "Ha ocurrido un error",
                message: "Ya se ha cargado anteriormente un archivo con ese nombre. Cargue otro archivo por favor.",
                type: message.Type.ERROR
            });

            myMsg.show();
        }
    }


    return {
        pageInit: pageInit
    };
    
});
