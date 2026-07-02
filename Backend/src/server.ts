import app from './app.js';
import {env} from './config/env.config.js';
import {prisma} from './lib/prisma.js';
import {logger} from './lib/logger.js';


const startServer=async()=>{
try{
await prisma.$connect();
logger.info(
'Database connected'
);
const server=app.listen(
env.PORT,
()=>{
logger.info(
`Server running on port ${env.PORT}`
);
}
);
process.on(
'SIGTERM',
async()=>{
logger.info(
'Shutdown signal received'
);
server.close(
async()=>{
await prisma.$disconnect();
logger.info(
'Server closed'
);
process.exit(0);
}
);
}
);
}catch(error){
logger.error(
'Server startup failed',
{
error
}
);
process.exit(1);
}
};
startServer();