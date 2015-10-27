var base_url = 'http://carservices.hqhrfid.com/';
//var base_url = 'http://localhost/~Cesar/carservices-server/public/';

$.ajaxSetup({ cache: false });

var NotificationTypes = {
	REQUEST_AGREE_SERVICEORDER : 0,
	REQUEST_AGREE_DIAGNOSTIC   : 1,
	REQUEST_AGREE_QUOTE        : 2,
	REQUEST_AGREE_DELIVERY     : 3,
	REMIND_KMCAPTURE           : 4,
	REMIND_SERVICETIME         : 5
};

var images = {
	0 : 'images/service_order.png',
	1 : 'images/service_diagnostic.png',
	2 : 'images/service_quote.png',
	3 : 'images/service_completed.png',
	4 : 'images/km_capture.png',
	5 : 'images/scheduled_service.png',
};

var pages = {
	0 : '#serviceOrderPage',
	1 : '#serviceDiagnosticPage',
	2 : '#quotePage',
	3 : '#serviceDeliveryPage',
	4 : '#kmCapturePage',
	5 : '#scheduledServicePage',
};

var ids = {
	0 : 'service_order_id',
	1 : 'service_order_id',
	2 : 'service_order_id',
	3 : 'service_order_id',
	4 : 'car_id',
	5 : 'scheduled_service_id',
};

var ServiceStatus = {
    DOES_NOT_APPLY : -1,
    NO_AVAILABLE   :  0,
    IN_PROCESS     :  1,
    WAITING_AGREE  :  2,
    AGREED         :  3,
    DISAGREED      :  4
};

var StatusDescription = {
    '-1' : 'No aplica',
      0  : 'No disponible',
      1  : 'En proceso',
      2  : 'Esperando autorización',
      3  : 'Aceptado',
      4  :  'Rechazado'
};


function changePage(page, id, idValue) {
	$(page).data(id, idValue);
	if (location.hash == page) {
		switch (page) {
			case 'serviceOrderPage':
				loadServiceOrder(idValue);
				break;
			case 'serviceDiagnosticPage':
				loadServiceDiagnostic(idValue);
				break;
			case 'quotePage':
				loadQuote(idValue);
				break;
			case 'serviceDeliveryPage':
				loadServiceDelivery(idValue);
				break;
			case 'kmCapturePage':
				loadKmCapture(idValue);
				break;
			case 'scheduledServicePage':
				loadScheduledService(idValue);
				break;
		}
		
	} else {
		$.mobile.pageContainer.pagecontainer('change', page, {
			transition: 'slide',
			showLoadMsg: true,
			changeHash: true
		});
	}
}

var app = {
	// Application Constructor
	initialize: function() {
		this.bindEvents();
	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function() {
		document.addEventListener('deviceready', this.onDeviceReady, false);
		document.addEventListener('resume', this.onResume, false);
	},
	onResume: function() {
		$(location.hash).trigger('pagebeforeshow');
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicitly call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		if ( device.platform === 'iOS'  && parseInt(device.version) === 9) {
		  $.mobile.hashListeningEnabled=false;
		}
		var push = PushNotification.init({
			'android': {
				'senderID': '44453978048'
			},
			'ios': {'alert': 'true', 'badge': 'true', 'sound': 'true'}, 
			'windows': {} 
		});
		
		push.on('registration', function(data) {
			console.log('registration event');
			console.log(JSON.stringify(data));
			localStorage.token = data.registrationId;
			if (localStorage.carOwnerId)
				registerToken();
		});

		push.on('notification', function(data) {
			console.log('notification event');
			console.log(JSON.stringify(data));
            if (data.additionalData.foreground) {
            	if (location.hash == "#notfPage")
            		loadNotifications();
				new $.nd2Toast({ // The 'new' keyword is important, otherwise you would overwrite the current toast instance
					message : data.title, // Required
					action : { // Optional (Defines the action button on the right)
						title : 'VER', // Title of the action button
						fn : function() { // function that will be triggered when action clicked
							changePage(
								pages[Number(data.additionalData.type)], 
								ids[Number(data.additionalData.type)], 
								data.additionalData.data);
					    },
					    color : 'deep-orange' // optional color of the button (default: 'lime')
					},
				   ttl : 10000 // optional, time-to-live in ms (default: 3000)
				 });
			} else {
				changePage(
					pages[Number(data.additionalData.type)], 
					ids[Number(data.additionalData.type)], 
					data.additionalData.data);	
			}
		});

		push.on('error', function(e) {
			console.log('push error');
		});
	}
};

app.initialize();

String.prototype.formatMoney = function(c, d, t) {
	var n = this, 
		c = isNaN(c = Math.abs(c)) ? 2 : c, 
		d = d == undefined ? '.' : d, 
		t = t == undefined ? ',' : t, 
		s = n < 0 ? '-' : '', 
		i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + '', 
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : '');
};

$(function () {
	$('[data-role=panel]').panel().enhanceWithin();
});

$(document).on('pagecreate', function () {
	$('[data-role=panel]').one('panelbeforeopen', function () {
		var height = $.mobile.pageContainer.pagecontainer('getActivePage').outerHeight();
		$('.ui-panel-wrapper').css('height', height + 1);
	});
});

$(document).on( 'pagebeforeshow', '#loginPage',function( event ) {
	if (localStorage.carOwnerId) {
		location.href = '#notfPage';
	} else {
		$('#formLogin')[0].reset();
	}
});

$(document).on( 'pagebeforeshow', '#carsPage', function( event ) {
	if (!localStorage.carOwnerId) {
		location.href = '#loginPage';
	} else {
		loadCars();
		loadPanel();
	}
});

$(document).on( 'pagebeforeshow', '#notfPage', function( event ) {
	if (!localStorage.carOwnerId) {
		location.href = '#loginPage';
	} else {
		loadNotifications();
		loadPanel();
	}
});

$(document).on( 'pagebeforeshow', '#carPage', function( event ) {
	loadCar($('#carPage').data('car_id'));
});

$(document).on( 'pagebeforeshow', '#historyPage', function( event ) {
	loadHistory($('#historyPage').data('car_id'));
});

$(document).on( 'pagebeforeshow', '#kmCapturePage', function( event ) {
	loadKmCapture($('#kmCapturePage').data('car_id'));
});

$(document).on( 'pagebeforeshow', '#serviceOrderPage', function( event ) {
	loadServiceOrder($('#serviceOrderPage').data('service_order_id'));
});

$(document).on( 'pagebeforeshow', '#serviceDiagnosticPage', function( event ) {
	loadServiceDiagnostic($('#serviceDiagnosticPage').data('service_order_id'));
});

$(document).on( 'pagebeforeshow', '#quotePage', function( event ) {
	loadQuote($('#quotePage').data('service_order_id'));
});

$(document).on( 'pagebeforeshow', '#serviceDeliveryPage', function( event ) {
	loadServiceDelivery($('#serviceDeliveryPage').data('service_order_id'));
});

$(document).on( 'pagebeforeshow', '#scheduledServicePage', function( event ) {
	loadScheduledService($('#scheduledServicePage').data('scheduled_service_id'));
});

var refresh = true;
$(document).on( 'pagebeforeshow', '#ownerPage',function( event ) {
	if (refresh) {
		$('#formOwner'   )[0].reset();
		$('#typePerson'  ).prop('checked', true);
		$('#divBusiness'    ).css('display', 'none');
		$('#divPerson'      ).css('display', 'flex');
		$('.row.secure_code').css('display', 'flex');
		if (localStorage.carOwnerId != null) {
			loadOwner();
		} else {
			fillStates(0,0);
		}
		refresh = false;
	}
});

$('#editProfile, #register').click( function (e) {
	e.preventDefault();
	refresh = true;
	$.mobile.pageContainer.pagecontainer('change', '#ownerPage', {
		transition: 'slideup',
		showLoadMsg: true,
		changeHash: true
	});
});

$('#logout').click( function (e) {
	e.preventDefault();
	unregisterToken();
	localStorage.removeItem('carOwnerId');
	$.mobile.pageContainer.pagecontainer('change', '#loginPage', {
		transition: 'slidedown',
		showLoadMsg: true,
		changeHash: true
	});
});

$('#btnLogin').click(function() {
	$('#formLogin').submit();
});

$('#formLogin').submit(function(e){
	var postData = $(this).serialize();
	e.preventDefault();
	$.ajax({
		type: 'POST',
		data: postData,
		dataType: 'json',
		url: base_url + 'carownerlogin/',
		success: function(data) {
			if (data.success) {
				window.localStorage.carOwnerId = data.id;
				registerToken();
				$.mobile.pageContainer.pagecontainer('change', '#notfPage', {
					transition: 'slideup',
					showLoadMsg: true,
					changeHash: true
				});
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	return false;
});

function registerToken() {
	if (localStorage.token) {
		var postData = {
			token    : localStorage.token,
			platform : device.platform,
			model    : device.model
		};
		$.ajax({
			type: 'POST',
			data: postData,
			dataType: 'json',
			url: base_url + 'registertoken/' + localStorage.carOwnerId + '/',
			success: function(data) {
				if (!data.success)
					alert(data.msj);
			},
			error: function (xhr, ajaxOptions, thrownError) {
				alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
			}
		});
	}
}

function unregisterToken() {
	if (localStorage.token) {
		var postData = {
			token    : localStorage.token
		};
		$.ajax({
			type: 'POST',
			data: postData,
			dataType: 'json',
			url: base_url + 'unregistertoken/' + localStorage.carOwnerId + '/',
			success: function(data) {
				if (!data.success)
					new $.nd2Toast({ message : data.msj });
			},
			error: function (xhr, ajaxOptions, thrownError) {
				alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
			}
		});
	}
}

$('#btnSaveOwner').click(function() {
	$('#formOwner').submit();
	return false;
});

$('#formOwner').submit(function() {
	var postData = $(this).serializeObject();
	if (validateRegisterData(postData)) {
		$.ajax({
			type: 'POST',
			data: postData,
			dataType: 'json',
			url: base_url + 'saveowner/' + (localStorage.carOwnerId ? localStorage.carOwnerId : '0'),
			success: function(data) {
				if (data.success) {
					$('#logout').click();
				} else {
					new $.nd2Toast({ message : data.msj });
				}
			},
			error: function (xhr, ajaxOptions, thrownError) {
				alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
			}
		});
	}
	return false;
});

function fillStates(stateId, townId) {
	$.ajax({
		type: 'GET',
		url: base_url + 'states/',
		dataType: 'json',
		success: function(d) {        
			var select = $('#state').empty();
			for (i = 0; i < d.length; i++)
				select.append('<option value=\"' + d[i].id +'\">' + d[i].state + '</option>');
			select.val(stateId).selectmenu('refresh');
			fillTowns(stateId, townId);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

$('#state').change(function () {
	fillTowns($('#state').val(), 0);
});

function fillTowns(stateId, townId) {
	$.ajax({
		type: 'GET',
		url: base_url + 'towns/' + stateId,
		dataType: 'json',
		success: function(d) {        
			var select = $('#town').empty();
			for (i = 0; i < d.length; i++)
				select.append('<option value=\"' + d[i].id + '\">' + d[i].town + '</option>');
			select.val(townId).selectmenu('refresh');
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}


$('#typePerson, #typeBusiness').change(function () {
	type = $('#formOwner input[name=type]:checked').val();
	if (type == 'Business') {
		$('#divBusiness').css('display', 'flex');
		$('#divPerson'  ).css('display', 'none');
		$('#divPerson input').val('');
	}
	if (type == 'Person') {
		$('#divPerson'  ).css('display', 'flex');
		$('#divBusiness').css('display', 'none');
		$('#divBusiness input').val('');
	}
});

function validateRegisterData (data) {
	var re_pcode = /^\d{5}$/;
	var re_phone = /^\d{10}$/;
	var re_email = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
	var re_pword = /^(?=.*\d)(?=.*[a-zA-Z])[0-9A-Za-z@#\-_$%^&+=!\?]{8,20}$/;
	var re_uname = /^\w{5,20}$/;
	var re_names = /^([a-z ñáéíóú]{2,60})$/i;
	var re_rfc   = /^[A-ZÑ&]{3,4}[0-9]{2}[0-1][0-9][0-3][0-9][A-Z0-9]?[A-Z0-9]?[0-9A-Z]?$/;
	data.rfc = data.rfc.toUpperCase();
	if (data.type == 'Person') {
		if (!data.first_name) { 
			new $.nd2Toast({ message : 'Favor de ingresar su nombre' }); 
			return false; 
		}
		if (!re_names.test(data.first_name)) {
			new $.nd2Toast({ message : 'Favor de ingresar un nombre válido' });
			return false;
		}
		if (!data.last_name) {
			new $.nd2Toast({ message : 'Favor de ingresar su apellido paterno' });
			return false;
		}
		if (!re_names.test(data.last_name)) {
			new $.nd2Toast({ message : 'Favor de ingresar un apellido paterno válido' });
			return false;
		}
		if (!data.mother_maiden_name) {
			new $.nd2Toast({ message : 'Favor de ingresar su apellido materno' });
			return false;
		}
		if (!re_names.test(data.mother_maiden_name)) {
			new $.nd2Toast({ message : 'Favor de ingresar un apellido materno válido' });
			return false;
		}
	} else {
		if (!data.business_name) {
			new $.nd2Toast({ message : 'Favor de ingresar su razón social' });
			return false;
		}
		if (!data.rfc) {
			new $.nd2Toast({ message : 'Favor de ingresar su RFC' });
			return false;
		}
		if (!re_rfc.test(data.rfc)) {
			new $.nd2Toast({ message : 'Favor de ingresar un RFC válido' });
			return false;
		}
	}
	if (!data.username) {
		new $.nd2Toast({ message : 'Favor de escribir un nombre de usuario' });
		return false;
	}
	if (!re_uname.test(data.username)) {
		setTimeout(function() { 
			new $.nd2Toast({ message : 'El nombre de usario debe estar conformado por:' });
			setTimeout(function() { 
				new $.nd2Toast({ message : '. Solo carácteres alfanumericos' });
				setTimeout(function() { 
					new $.nd2Toast({ message : '. Una longitud entre 5 y 20 carácteres' }); 
				}, 3000);
			}, 3000);
		}, 0);
		return false;
	}
	if (!data.password) {
		new $.nd2Toast({ message : 'Favor de escribir la contraseña' });
		return false;
	}
	if (!re_pword.test(data.password)) {
		setTimeout(function() { 
			new $.nd2Toast({ message : 'La contraseña debe debe estar conformada por:', ttl : 2000 });
			setTimeout(function() { 
				new $.nd2Toast({ message : '. Al menos un número', ttl : 2000 });
				setTimeout(function() { 
					new $.nd2Toast({ message : '. Al menos una letra', ttl : 2000 });
					setTimeout(function() { 
						new $.nd2Toast({ message : '. Iniciar con una letra o número', ttl : 2000 });
						setTimeout(function() {
							new $.nd2Toast({ message : '. Una longitud entre 8 y 20 carácteres', ttl : 2000 });
							setTimeout(function() {
								new $.nd2Toast({ message : '. Son admitidos los símbolos: @ # - _ $ % ^ & + = ! ?', ttl : 3000 });
							}, 2000);
						}, 2000);
					}, 2000);
				}, 2000);
			}, 2000);
		}, 0);
		return false;
	}
	if (data.password != data.confirm_password) {
		new $.nd2Toast({ message : 'Las contraseñas no coinciden' });
		return false;
	}
	if (!data.secure_code && !localStorage.carOwnerId) {
		new $.nd2Toast({ message : 'Favor de escribir el código de seguridad' });
		return false;
	}
	if (data.postal_code && !re_pcode.test(data.postal_code)) {
		new $.nd2Toast({ message : 'El código postal debe ser de 5 digitos' });
		return false;
	}
	if (data.phone_number
		&& !re_phone.test(data.phone_number.replace(/\s/g,'').replace(/-/g,'').replace(/\(/g,'').replace(/\)/,'').replace(/\+/g,'').replace(/\./g, ''))) {
		new $.nd2Toast({ message : 'Teléfono local debe ser de 10 digitos' });
		return false;
	}
	if (data.mobile_phone_number
		&& !re_phone.test(data.mobile_phone_number.replace(/\s/g,'').replace(/-/g,'').replace(/\(/g,'').replace(/\)/,'').replace(/\+/g,'').replace(/\./g, ''))) {
		new $.nd2Toast({ message : 'Teléfono celular debe ser de 10 digitos' });
		return false;
	}
	if (data.email && !re_email.test(data.email)) {
		new $.nd2Toast({ message : 'Favor de escribir un email válido' });
		return false;
	}
	return true;
}

function loadPanel() {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'ownername/' + localStorage.carOwnerId + '/',
		success: function(data) {
			if (data.success) {
				$('[name="carOwnerName"]').text(data.owner_name.name);
				$('[name="carOwnerUsername"]').text(data.owner_name.username);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		},
		complete: function() {
		}
	});
}

function loadOwner() {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'profile/' + localStorage.carOwnerId + '/',
		success: function(data) {
			if (data.success) {
				$('input:radio[name=type]').filter('[value=\''+ data.car_owner.type +'\']').prop('checked', true).click();
				$('#divBusiness'    ).css('display', data.car_owner.type == 'Business'? 'flex' : 'none');
				$('#divPerson'      ).css('display', data.car_owner.type == 'Person'  ? 'flex' : 'none');
				$('.row.secure_code').css('display', 'none');
				$('#business_name'      ).val(data.car_owner.business_name);
				$('#rfc'                ).val(data.car_owner.rfc);
				$('#first_name'         ).val(data.car_owner.first_name);
				$('#last_name'          ).val(data.car_owner.last_name);
				$('#mother_maiden_name' ).val(data.car_owner.mother_maiden_name);
				$('#street'             ).val(data.car_owner.street);
				$('#neighborhood'       ).val(data.car_owner.neighborhood);
				$('#postal_code'        ).val(data.car_owner.postal_code);
				$('#phone_number'       ).val(data.car_owner.phone_number);
				$('#mobile_phone_number').val(data.car_owner.mobile_phone_number);
				$('#email'              ).val(data.car_owner.email);
				$('#username'           ).val(data.car_owner.username);
				$('#password'           ).val(data.car_owner.password);
				$('#confirm_password'   ).val(data.car_owner.password);
				fillStates(data.car_owner.state_id ? data.car_owner.state_id : 0, 
					data.car_owner.town_id ? data.car_owner.town_id : 0);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		},
		complete: function() {
		}
	});
}

function loadCars() {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'cars/' + localStorage.carOwnerId + '/',
		success: function(data) {
			if (data.success) {
				var carStatus = ['cars_in_operation', 'cars_in_workshop'];
				for (var i = 0; i < carStatus.length; i++) {
					var listview = $('#' + carStatus[i]).empty();
					$('#no-' + carStatus[i]).css('display', data[carStatus[i]].length ? 'none' : 'block');
					for (var j = 0; j < data[carStatus[i]].length; j++) {
						var item = $('<li/>');
						$(listview).append(item);
						var link = $('<a/>', {href : '#'});
						$(item).append(link);
						var img = $('<img/>', {
							src : 'images/car-thumbnail.png',
							'class' : 'ui-thumbnail ui-thumbnail-circular clr-bg-deep-orange'
						});
						$(link).data('car_id', data[carStatus[i]][j].id);
						$(link).click( function(e) {
							e.preventDefault();
							$('#carPage').data('car_id', $(this).data('car_id'));
							$.mobile.pageContainer.pagecontainer('change', '#carPage', {
								transition: 'slide',
								showLoadMsg: true,
								changeHash: true
							});
						});
						$(link).append(img);
						$(link).append($('<h2/>').text(data[carStatus[i]][j].description));
						$(link).append($('<p/>').text( data[carStatus[i]][j].serial_number));
					}
				}
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		},
		complete: function() {
			$('#cars_in_operation').listview().listview('refresh');
			$('#cars_in_workshop').listview().listview('refresh');
		}
	});
}

function loadNotifications() {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'notifications/' + localStorage.carOwnerId + '/',
		success: function(data) {
			if (data.success) {
				$('#no-notif').css('display', data.notifications.length ? 'none' : 'block');
				var listview = $('#notifications').empty();
				for (var i = 0; i < data.notifications.length; i++) {
					var item = $('<li/>');
					$(listview).append(item);
					var link = $('<a/>',{href:'#'});
					$(item).append(link);
					var img = $('<img/>', {
						'class' : 'ui-thumbnail ui-thumbnail-circular'
					});
					$(img).attr('src', images[data.notifications[i].type]);
					$(link).data('type', data.notifications[i].type);
					$(link).data(ids[data.notifications[i].type], data.notifications[i].data);
					$(link).click(function() {
						type = $(this).data('type');
						data = $(this).data(ids[type]);
						changePage(pages[type], ids[type], data);
					});
					$(link).append(img);
					$(link).append($('<h2/>').text(data.notifications[i].title));
					$(link).append($('<p/>').text( data.notifications[i].message));
					$(link).append($('<p/>').text( data.notifications[i].date));
				}
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('#notifications').listview().listview('refresh');  
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

$('#update_notf').click(function(e) {
	e.preventDefault();
	location.reload(true);
	e.stopImmediatePropagation();
});

function loadServiceOrder(serviceOrderId) {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'inventoryowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if (data.success) {
				$('#service_name'          ).text(data.service_inventory.service_name             );
				$('#order_user'            ).text(data.service_inventory.user_in_charge           );
				$('#order_datecreated'     ).text(data.service_inventory.created_date             );
				$('#order_dateclosed'      ).text(data.service_inventory.closed_date              );
				$('#order_dateagree'       ).text(data.service_inventory.agreed_date              );
				$('#order_datedisagree'    ).text(data.service_inventory.disagreed_date           );
				$('#order_workshop'        ).text(data.service_inventory.workshop_name            );
				$('#order_car'             ).text(data.service_inventory.car                      );
				$('#order_status'          ).text(StatusDescription[data.service_inventory.status]);
				$('#owner_allow_used_parts').text(data.service_inventory.owner_allow_used_parts   );
				$('#owner_supplied_parts'  ).text(data.service_inventory.owner_supplied_parts     );
				$('#pick_up_address'       ).text(data.service_inventory.pick_up_address          );
				$('#delivery_address'      ).text(data.service_inventory.delivery_address         );
				$('#km'                    ).text(data.service_inventory.km ? 
					data.service_inventory.km.formatMoney(0) + ' KM' : '');
				$('#fuel_level'            ).text(data.service_inventory.fuel_level + '/4'        );
				$('#brake_fluid'           ).text(data.service_inventory.brake_fluid              );
				$('#wiper_fluid'           ).text(data.service_inventory.wiper_fluid              );
				$('#antifreeze'            ).text(data.service_inventory.antifreeze               );
				$('#oil'                   ).text(data.service_inventory.oil                      );
				$('#power_steering_fluid'  ).text(data.service_inventory.power_steering_fluid     );
				$('#order_datecreated' ).parent().css('display', data.service_inventory.created_date     ? 'block' : 'none');
				$('#order_dateclosed'  ).parent().css('display', data.service_inventory.closed_date      ? 'block' : 'none');
				$('#order_dateagree'   ).parent().css('display', data.service_inventory.agreed_date      ? 'block' : 'none');
				$('#order_datedisagree').parent().css('display', data.service_inventory.disagreed_date   ? 'block' : 'none');
				$('#pick_up_address'   ).parent().css('display', data.service_inventory.pick_up_address  ? 'block' : 'none');
				$('#delivery_address'  ).parent().css('display', data.service_inventory.delivery_address ? 'block' : 'none');
				$('#order_footer'      ).css('display', data.service_inventory.status == ServiceStatus.WAITING_AGREE &&  
					data.service_inventory.editable ? 'block' : 'none');
				$('.order_content'     ).css('display', data.service_inventory.status != ServiceStatus.IN_PROCESS  ? 'block' : 'none');
				$('#agree_order'   ).data('service_order_id', serviceOrderId);
				$('#disagree_order').data('service_order_id', serviceOrderId);
				$('#inside_photos' ).data('service_order_id', serviceOrderId);
				$('#outside_photos').data('service_order_id', serviceOrderId);
				$('#trunk_photos'  ).data('service_order_id', serviceOrderId);
				$('#motor_photos'  ).data('service_order_id', serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('#orderLevels').table( 'refresh' );
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			alert('Error type :' + errorThrown + ' Error message :' + XMLHttpRequest.responseXML + ' textStatus: ' + textStatus);
		}
	});
}

$('#agree_order').click( function (e) {
	e.preventDefault();
	serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'agreeinventoryowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Orden de servicio aceptada' });
				loadServiceOrder(serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

$('#disagree_order').click( function (e) {
	e.preventDefault();
	serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'disagreeinventoryowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Orden de servicio rechazada' });
				loadServiceOrder(serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

$('#inside_photos').click( function( e ) {
	e.preventDefault();
	showPhotos($(this).data('service_order_id'), 'inside');
});

$('#outside_photos').click( function( e ) {
	e.preventDefault();
	showPhotos($(this).data('service_order_id'), 'outside');
	e.stopImmediatePropagation();
});

$('#motor_photos').click( function( e ) {
	e.preventDefault();
	showPhotos($(this).data('service_order_id'), 'motor');
	e.stopImmediatePropagation();
});

$('#trunk_photos').click( function( e ) {
	e.preventDefault();
	showPhotos($(this).data('service_order_id'), 'trunk');
	e.stopImmediatePropagation();
});

function showPhotos(serviceOrderId, type) {
	translate = {'inside':'Interior', 'outside':'Exterior', 'motor':'Motor', 'trunk':'Porta-equipaje'};
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: 
			base_url + 'listphotosowner/' + 
			localStorage.carOwnerId + '/' + 
			serviceOrderId          + '/' +
			type                    + '/',
		success: function(data) {
			if(data.success) {
				photos = [];
				if (data.photos.length == 0) {
					photos.push({ 
						href  : 'images/no-image.png', 
						title : translate[type]
					});
				}
				for (var i = 0; i < data.photos.length; i++) {
					photos.push({ 
						href  : 'data:image/png;base64,' + data.photos[i], 
						title : translate[type] + ' ' + (i + 1)
					});
				}
				$.swipebox(photos);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

function loadServiceDiagnostic(serviceOrderId) {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'diagnosticowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if (data.success) {
				$('#diagnostic_user'        ).text(data.service_diagnostic.user_in_charge);
				$('#diagnostic_datecreated' ).text(data.service_diagnostic.created_date);
				$('#diagnostic_dateclosed'  ).text(data.service_diagnostic.closed_date);
				$('#diagnostic_dateagree'   ).text(data.service_diagnostic.agreed_date);
				$('#diagnostic_datedisagree').text(data.service_diagnostic.disagreed_date);
				$('#diagnostic_workshop'    ).text(data.service_diagnostic.workshop_name);
				$('#diagnostic_car'         ).text(data.service_diagnostic.car);
				$('#diagnostic_status'      ).text(StatusDescription[data.service_diagnostic.status]);
				$('#front_brakes'           ).text(data.service_diagnostic.front_brakes);
				$('#rear_brakes'            ).text(data.service_diagnostic.rear_brakes);
				$('#front_shock_absorber'   ).text(data.service_diagnostic.front_shock_absorber);
				$('#rear_shock_absorber'    ).text(data.service_diagnostic.rear_shock_absorber);
				$('#suspension'             ).text(data.service_diagnostic.suspension);
				$('#tires'                  ).text(data.service_diagnostic.tires);
				$('#bands'                  ).text(data.service_diagnostic.bands);
				$('#diagnostic_description' ).text(data.service_diagnostic.description);
				$('#diagnostic_datecreated' ).parent().css('display', data.service_diagnostic.created_date   ? 'block' : 'none');
				$('#diagnostic_dateclosed'  ).parent().css('display', data.service_diagnostic.closed_date    ? 'block' : 'none');
				$('#diagnostic_dateagree'   ).parent().css('display', data.service_diagnostic.agreed_date    ? 'block' : 'none');
				$('#diagnostic_datedisagree').parent().css('display', data.service_diagnostic.disagreed_date ? 'block' : 'none');
				$('#diagnostic_footer'      ).css('display', data.service_diagnostic.status == ServiceStatus.WAITING_AGREE &&
					data.service_diagnostic.editable ? 'block' : 'none');
				$('#diagnostic_content'     ).css('display', data.service_diagnostic.status != ServiceStatus.IN_PROCESS ? 'block' : 'none');
				$('#agree_diagnostic'   ).data('service_order_id', serviceOrderId);
				$('#disagree_diagnostic').data('service_order_id', serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('#diagnosticParts').table( 'refresh' );
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			alert('Error type :' + errorThrown + ' Error message :' + XMLHttpRequest.responseXML + ' textStatus: ' + textStatus);
		}
	});
}

$('#disagree_diagnostic').click(function (e) {
	e.preventDefault();
	var serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'disagreediagnosticowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Diagnóstico rechazado' });
				loadServiceDiagnostic(serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

$('#agree_diagnostic').click(function (e) {
	e.preventDefault();
	var serviceDiagnosticId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'agreediagnosticowner/' + localStorage.carOwnerId + '/' + serviceDiagnosticId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Diagnóstico aceptado' });
				loadServiceDiagnostic(serviceDiagnosticId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

function loadQuote(serviceOrderId) {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'quoteowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if (data.success) {
				$('#quote_workshop'     ).text(data.quote.workshop_name);
				$('#quote_user'         ).text(data.quote.user_in_charge);
				$('#quote_car'          ).text(data.quote.car);
				$('#quote_datecreated'  ).text(data.quote.created_date);
				$('#quote_dateclosed'   ).text(data.quote.closed_date);
				$('#quote_dateagree'    ).text(data.quote.agreed_date);
				$('#quote_datedisagree' ).text(data.quote.disagreed_date);
				$('#quote_dateestimated').text(data.quote.estimated_date);
				$('#quote_status'       ).text(StatusDescription[data.quote.status]);
				$('#quote_datecreated'  ).parent().css('display', data.quote.created_date   ? 'block' : 'none');
				$('#quote_dateclosed'   ).parent().css('display', data.quote.closed_date    ? 'block' : 'none');
				$('#quote_dateagree'    ).parent().css('display', data.quote.agreed_date    ? 'block' : 'none');
				$('#quote_datedisagree' ).parent().css('display', data.quote.disagreed_date ? 'block' : 'none');
				$('#quote_dateestimated').parent().css('display', data.quote.estimated_date ? 'block' : 'none');
				$('#quote_footer'       ).css('display', data.quote.status == ServiceStatus.WAITING_AGREE && 
					data.quote.editable ? 'block' : 'none');
				$('#quote_content'      ).css('display', data.quote.status != ServiceStatus.IN_PROCESS ? 'block' : 'none');
				$('#quote_items').empty();
				for (var i = 0; i < data.quote.quote_items.length; i++) {
					var row = $('<tr/>');
					row.append($('<td/>').text(data.quote.quote_items[i].amount));
					row.append($('<td/>').text(data.quote.quote_items[i].description));
					row.append($('<td/>').text(data.quote.quote_items[i].subtotal));
					$('#quote_items').append(row);
				}
				$('#quote_subtotal'       ).text('$ ' + data.quote.subtotal);
				$('#quote_tax'            ).text('$ ' + data.quote.tax);
				$('#quote_total'          ).text('$ ' + data.quote.total);
				$('#quote_advance_payment').text('$ ' + data.quote.advance_payment);
				$('#agree_quote'   ).data('service_order_id', serviceOrderId);
				$('#disagree_quote').data('service_order_id', serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('#quoteTable').table( 'refresh' );
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			alert('Error type :' + errorThrown + ' Error message :' + XMLHttpRequest.responseXML + ' textStatus: ' + textStatus);
		}
	});
}

$('#agree_quote').click( function (e){
	e.preventDefault();
	var serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'agreequoteowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Cotización aceptada' });
				loadQuote(serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

$('#disagree_quote').click( function (e){
	e.preventDefault();
	var serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'disagreequoteowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Cotización rechazada' });
				loadQuote(serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

function loadServiceDelivery(serviceOrderId) {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'completedserviceowner/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if (data.success) {
				$('#delivery_workshop').text(data.service_complete.workshop_name);
				$('#delivery_date'    ).text(data.service_complete.date);
				$('#delivery_car'     ).text(data.service_complete.car);
				$('#agree_delivery'   ).data('service_order_id', serviceOrderId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
				
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			alert('Error type :' + errorThrown + ' Error message :' + XMLHttpRequest.responseXML + ' textStatus: ' + textStatus);
		}
	});
}

$('#agree_delivery').click( function (e) {
	e.preventDefault();
	var serviceOrderId = $(this).data('service_order_id');
	$.ajax({
		type: 'POST',
		dataType: 'json',
		url: base_url + 'knowcompleteservice/' + localStorage.carOwnerId + '/' + serviceOrderId + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Enterado' });
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
	e.stopImmediatePropagation();
});

function loadCar(carId){
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'carcarowner/' + localStorage.carOwnerId + '/' + carId + '/',
		success: function(data) {
			if (data.success) {
				$('#car_photo'        ).attr('src', data.car.photo ? 
					('data:image/png;base64,' + data.car.photo) : 'images/no-car-image.png');
				$('#car_tag'          ).text(data.car.tag);
				$('#car_brand'        ).text(data.car.brand);
				$('#car_model'        ).text(data.car.model);
				$('#car_year'         ).text(data.car.year);
				$('#car_color'        ).text(data.car.color);
				$('#car_km'           ).text(data.car.km.formatMoney(0) + ' KM');
				$('#car_status'       ).text(data.car.status);
				$('#car_serial_number').text(data.car.serial_number);
				$('#car_license_plate').text(data.car.license_plate);
				$('#car_kmcapture'    ).data('car_id', carId);
				$('#car_history'      ).data('car_id', carId);
				$('#car_kmcapture'    ).parents('.col-xs').css('display', data.car.status == 'En taller' ? 'none' : 'block');
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

$('#car_kmcapture').click( function(e) {
	e.preventDefault();
	$('#kmCapturePage').data('car_id', $(this).data('car_id'));
	$.mobile.pageContainer.pagecontainer('change', '#kmCapturePage', {
		transition: 'slide',
		showLoadMsg: true,
		changeHash: true
	});
	e.stopImmediatePropagation();
});

$('#car_history').click( function(e) {
	e.preventDefault();
	$('#historyPage').data('car_id', $(this).data('car_id'));
	$.mobile.pageContainer.pagecontainer('change', '#historyPage', {
		transition: 'slide',
		showLoadMsg: true,
		changeHash: true
	});
	e.stopImmediatePropagation();
});

function loadKmCapture(carId) {
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'kmcapture/' + localStorage.carOwnerId + '/' + carId + '/',
		success: function(data) {
			if (data.success) {
				$('#kmcapture_car'          ).text(data.km_capture.car);
				$('#kmcapture_serial_number').text(data.km_capture.serial_number);
				$('#kmcapture_last_km'      ).text(data.km_capture.last_km.formatMoney(0) + ' KM');
				$('#kmcapture_last_km_popup').text(data.km_capture.last_km.formatMoney(0));
				$('#kmcapture_new_km'       ).val('');
				$('#btnUpdateKm').data('car_id', carId);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {

		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

$('#btnPopup').click( function(event) {
	var newKm = $('#kmcapture_new_km').val();
	var re = /^\d+$/;
	if (re.test(newKm)) {
		$('#kmcapture_new_km_popup').text(parseInt(newKm).formatMoney(0));
	} else {
		event.preventDefault();
		new $.nd2Toast({ message : 'Favor de escribir un kilometraje válido' });
		event.stopImmediatePropagation();
	}
});

$('#btnUpdateKm').click( function(e) {
	id = $(this).data('car_id');
	$.ajax({
		type: 'POST',
		data: $('#kmcapture_new_km').serialize(),
		dataType: 'json',
		url: base_url + 'updatekm/' + localStorage.carOwnerId + '/' + id + '/',
		success: function(data) {
			if(data.success) {
				new $.nd2Toast({ message : 'Kilometraje actualizado' });
				loadKmCapture(id);
			} else {
				e.preventDefault();
				new $.nd2Toast({ message : data.msj });
				e.stopImmediatePropagation();
			}
		},
		error : function(XMLHttpRequest, textStatus, errorThrown) {
			alert('Error type :' + errorThrown + ' Error message :' + XMLHttpRequest.responseXML + ' textStatus: ' + textStatus);
		}
	});
	
});

function loadHistory(carId) {
	//alert('history in construction \uD83D\uDEA7');
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'carhistory/' + localStorage.carOwnerId + '/' + carId + '/',
		success: function(data) {
			if (data.success) {
				var tbody = $('#historyBody').empty();
				var colors = ['clr-btn-grey ui-disabled', 'clr-btn-indigo', 'clr-btn-yellow', 'clr-btn-green', 'clr-btn-red', 'clr-btn-red'];
				for (var i = 0; i < data.history.length; i++) {
					var tr = $('<tr/>');
					tbody.append(tr);
					tr.append($('<td/>').text(data.history[i].entry_date));
					tr.append($('<td/>').text(data.history[i].completion_date));
					tr.append($('<td/>').text(data.history[i].exit_date));
					tr.append($('<td/>').text(data.history[i].workshop));
					var td  = $('<td/>');
					tr.append(td);
					var orderLink = $('<a/>', {
						href   :'#',
						'class':'ui-btn ui-mini ui-btn-inline ' + colors[data.history[i].order_status]
					}).text('E');
					td.append(orderLink);
					$(orderLink).data('service_order_id', data.history[i].service_order_id);
					$(orderLink).click(function() {
						$('#serviceOrderPage').data('service_order_id', $(this).data('service_order_id'));
						$.mobile.pageContainer.pagecontainer('change', '#serviceOrderPage', {
							transition: 'slide',
							showLoadMsg: true,
							changeHash: true
						});
					});
					var diagnosticLink = $('<a/>',{
						href   :'#', 
						'class':'ui-btn ui-mini ui-btn-inline ' + colors[data.history[i].diagnostic_status]
					}).text('D');
					td.append(diagnosticLink);
					$(diagnosticLink).data('service_order_id', data.history[i].service_order_id);
					$(diagnosticLink).click(function() {
						$('#serviceDiagnosticPage').data('service_order_id', $(this).data('service_order_id'));
						$.mobile.pageContainer.pagecontainer('change', '#serviceDiagnosticPage', {
							transition: 'slide',
							showLoadMsg: true,
							changeHash: true
						});
					});
					var quoteLink = $('<a/>', {
						href   :'#', 
						'class':'ui-btn ui-mini ui-btn-inline ' + colors[data.history[i].quote_status]
					}).text('C');
					td.append(quoteLink);
					$(quoteLink).data('service_order_id', data.history[i].service_order_id);
					$(quoteLink).click(function() {
						$('#quotePage').data('service_order_id', $(this).data('service_order_id'));
						$.mobile.pageContainer.pagecontainer('change', '#quotePage', {
							transition: 'slide',
							showLoadMsg: true,
							changeHash: true
						});
					});
				};
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('#historyTable').table( 'refresh' );
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}

function loadScheduledService(scheduledServiceId){
	$.ajax({
		type: 'GET',
		dataType: 'json',
		url: base_url + 'scheduledservice/' + localStorage.carOwnerId + '/' + scheduledServiceId + '/',
		success: function(data) {
			if (data.success) {
				$('#scheduled_car'          ).text(data.scheduled_service.car);
				$('#scheduled_serial_number').text(data.scheduled_service.serial_number);
				$('#scheduled_current_km'   ).text(data.scheduled_service.current_km.formatMoney(0) + ' KM');
				$('#scheduled_required_km'  ).text(data.scheduled_service.required_km.formatMoney(0) + ' KM');
				$('#scheduled_required_date').text(data.scheduled_service.required_date);
				$('#scheduled_description'  ).text(data.scheduled_service.description);
			} else {
				new $.nd2Toast({ message : data.msj });
			}
		},
		complete: function() {
			$('.table').trigger( 'create' );
		},
		error: function (xhr, ajaxOptions, thrownError) {
			alert(xhr.status + ' ' + thrownError + '\n' + xhr.responseText);
		}
	});
}


