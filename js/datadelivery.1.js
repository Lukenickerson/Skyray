
var DataDeliveryClass = function (dataVarName) 
{
	this.dataVarName = dataVarName;
	
	this.deliver = function (jsonUrl, callback) {
		var v = this.dataVarName;
		$.ajax({
			type: 		"get"
			,url:		jsonUrl
			,dataType: 	"json"
			,complete: function(x,t) {
			}
			,success: function(responseObj) {
				try {
					if (v.length > 0) {
						window[v] = responseObj;
					}
					//var responseObj = $.parseJSON(response);
					console.log("Ajax Success loading data");
				} catch (err) {
					alert("ERROR IN JSON DATA");
					console.error("ERROR IN JSON DATA");
					console.log(responseObj);
				}
				if (typeof callback === 'function') callback(responseObj);
			}
			,failure: function(msg) {
				console.error("Fail\n"+ msg);
			}
			,error: function(x, textStatus, errorThrown) {
				console.error("Error\n" + x.responseText + "\nText Status: " + textStatus + "\nError Thrown: " + errorThrown);
			}
		});
	}
	if (!window.jQuery) { alert("ERROR - jQuery is not loaded!"); }
}