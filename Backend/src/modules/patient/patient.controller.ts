import {Request,Response} from 'express';
import {PatientService} from './patient.service.js';
import {successResponse,errorResponse} from '../../utils/response.util.js';
import {logger} from '../../lib/logger.js';

const patientService=new PatientService();


export const getPatientProfile=async(
req:Request,
res:Response
)=>{

try{

const patient=
await patientService.getPatientProfileByUserId(
req.user.id
);


return successResponse(
res,
"Patient profile retrieved successfully",
patient,
200
);


}catch(error:any){

logger.error(
"Patient profile error",
{
requestId:req.requestId,
error:error.message
}
);


return errorResponse(
res,
"Unable to retrieve patient profile",
500
);

}

};



export const updatePatientProfile=async(
req:Request,
res:Response
)=>{

try{


const updated=
await patientService.updatePatientProfileByUserId(
req.user.id,
req.body
);


return successResponse(
res,
"Profile updated successfully",
updated,
200
);


}catch(error:any){

return errorResponse(
res,
"Unable to update profile",
400
);

}

};



export const getMedicalHistory=async(
req:Request,
res:Response
)=>{


try{


const history=
await patientService.getMedicalHistoryByUserId(
req.user.id
);


return successResponse(
res,
"Medical history retrieved successfully",
history,
200
);


}catch(error:any){


return errorResponse(
res,
"Unable to retrieve medical history",
500
);


}

};



export const getPatientQR=async(
req:Request,
res:Response
)=>{


try{


const qr=
await patientService.generatePatientQR(
req.user.id
);


return successResponse(
res,
"QR generated successfully",
qr,
200
);


}catch(error:any){


return errorResponse(
res,
"Unable to generate QR",
500
);


}

};