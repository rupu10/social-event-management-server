const express = require("express");
const cors = require("cors");
const app = express();
const admin = require("firebase-admin");




const port = process.env.PORT || 7000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@rupudb.gt3dpny.mongodb.net/?retryWrites=true&w=majority&appName=RupuDB`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const decodedKey = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf-8');
const serviceAccount = JSON.parse(decodedKey);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  // console.log(authHeader);
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized message" });
  }
};

const verifyTokenEmail = (req, res, next) => {
  if (req.query.email !== req.decoded.email) {
    res.status(403).send({ message: "forbidden access" });
  }
  next();
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const eventsCollection = client.db("social-events").collection("events");
    const joinEventsCollection = client
      .db("social-events")
      .collection("joinEvents");

    // events api


    
    // app.get(
    //   "/events",
    //   async (req, res) => {
    //     const { email, title } = req.query;

    //     const query = {};
    //     if (email) {
    //       query.creator_email = email;
    //     }

    //     if (title) {
    //       query.title = { $regex: title, $options: "i" };
    //     }
    //     const now = Date.now();
    //     //   query.eventDateNumber = { $gte: now };

    //     const futureQuery = {
    //       ...query,
    //       eventDateNumber: { $gte: now },
    //     };

    //     const pastQuery = {
    //       ...query,
    //       eventDateNumber: { $lt: now },
    //     };

    //     const noDateQuery = {
    //       ...query,
    //       eventDateNumber: { $exists: false },
    //     };

    //     const upcomingEvents = await eventsCollection
    //       .find(futureQuery)
    //       .sort({ eventDateNumber: 1 })
    //       .toArray();

    //     const pastEvents = await eventsCollection
    //       .find(pastQuery)
    //       .sort({ eventDateNumber: 1 })
    //       .toArray();

    //     const undatedEvents = await eventsCollection
    //       .find(noDateQuery)
    //       .toArray();

    //     const allEvents = [...upcomingEvents, ...pastEvents, ...undatedEvents];

    //     res.send(allEvents);
    //   }
    // );

    app.get("/events", async (req, res) => {
  const { email, title, sort } = req.query;
  const query = {};

  if (email) query.creator_email = email;
  if (title) query.title = { $regex: title, $options: "i" };

  const now = Date.now();

  const futureQuery = { ...query, eventDateNumber: { $gte: now } };
  const pastQuery = { ...query, eventDateNumber: { $lt: now } };
  const noDateQuery = { ...query, eventDateNumber: { $exists: false } };

  let events = [];

  if (sort === "upcoming") {
    // upcoming first, then past
    const upcomingEvents = await eventsCollection
      .find(futureQuery)
      .sort({ eventDateNumber: 1 })
      .toArray();
    const pastEvents = await eventsCollection
      .find(pastQuery)
      .sort({ eventDateNumber: 1 })
      .toArray();
    const undatedEvents = await eventsCollection.find(noDateQuery).toArray();
    events = [...upcomingEvents, ...pastEvents, ...undatedEvents];
  } else if (sort === "past") {
    // past first, then upcoming
    const pastEvents = await eventsCollection
      .find(pastQuery)
      .sort({ eventDateNumber: -1 })
      .toArray();
    const upcomingEvents = await eventsCollection
      .find(futureQuery)
      .sort({ eventDateNumber: 1 })
      .toArray();
    const undatedEvents = await eventsCollection.find(noDateQuery).toArray();
    events = [...pastEvents, ...upcomingEvents, ...undatedEvents];
  } else {
    // default: all unsorted
    events = await eventsCollection.find(query).toArray();
  }

  res.send(events);
});



app.get("/manage-event",verifyFirebaseToken,
      verifyTokenEmail,  async (req, res) => {
      const {email} = req.query;
    const query = {};
        if (email) {
          query.creator_email = email;
        }
      const result = await eventsCollection
        .find(query)
        .toArray();
      res.send(result);
    });
    

    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
      res.send(result);
    });

    app.post("/events", async (req, res) => {
      const newEvent = req.body;
      // console.log(newEvent);
      const result = await eventsCollection.insertOne(newEvent);
      res.send(result);
    });

    app.put("/events/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedEvent = req.body;
      const updateDoc = {
        $set: updatedEvent,
      };
      const result = await eventsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });


    app.delete('/events/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await eventsCollection.deleteOne(query)
        res.send(result)
    })

    // join events related api
    // ,verifyFirebaseToken, verifyTokenEmail

    app.get(
      "/joinEvents",
      verifyFirebaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;

        const query = {
          applicant: email,
        };
        const result = await joinEventsCollection.find(query).toArray();

        res.send(result);
      }
    );

    app.post("/joinEvents", async (req, res) => {
      const joinEvent = req.body;
      // console.log(joinEvent);
      const result = await joinEventsCollection.insertOne(joinEvent);
      res.send(result);
    });

    // feature section api
    app.get("/ourEvents", async (req, res) => {
      const ourEvents = await eventsCollection.find().limit(6).toArray();
      res.send(ourEvents);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("social events are coming");
});

app.listen(port, () => {
  console.log(`social events server is running on port ${port}`);
});



