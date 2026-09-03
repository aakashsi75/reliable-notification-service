const pool = require("./postgres");

async function test(){
    try{
        const result = await pool.query("SELECT 1");

        console.log("database connected");
        console.log(result.rows);
    }
    catch(error){
        console.error("Database connection failed:", error);
    }
    finally{
        await pool.end();
    }
}

test();