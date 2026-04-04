import { Liveblocks } from "@liveblocks/node";
import dotenv from 'dotenv';
dotenv.config();

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET,
});


const handleLiveblocksAuth = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = req.user; // This contains the user from the database (given by Passport)
  console.log("userL:", user);
// Start an auth session inside your endpoint
  const session = liveblocks.prepareSession(
    user._id.toString(),
    {
      userInfo: {
        name: user.displayName,
        email: user.email,
        avatar: user.profilePicture,
      }
    }
  );

  session.allow(`formulation-*`, session.FULL_ACCESS);

  // Authorize the user and return the result
  const { status, body } = await session.authorize();
  return res.status(status).end(body);


};

const handleSyncMasterToChildren = async (req, res) => {
  const { targetRoomIds, masterData } = req.body; 
  
  console.log("Syncing to rooms:", targetRoomIds);

  if (!targetRoomIds || !Array.isArray(targetRoomIds) || targetRoomIds.length === 0) {
    return res.status(400).json({ error: "No target rooms selected" });
  }

  try {
    const patch = {
      code: masterData.code,
      name: masterData.name,
      description: masterData.description,
      animal_group: masterData.animal_group,
      cost: masterData.cost,
      ingredients: masterData.ingredients,
      nutrients: masterData.nutrients,
      nutrientRatioConstraints: masterData.nutrientRatioConstraints || []
    };

    // Use updateStorageDocument instead of updateRoomStorage
    const syncTasks = targetRoomIds.map(async (roomId) => {
      try {
        return await liveblocks.updateStorageDocument(roomId, {
          formulation: patch 
        });
      } catch (roomError) {
        // Log individual room failures but don't stop the whole process
        console.error(`Error updating room ${roomId}:`, roomError.message);
        return null; 
      }
    });

    await Promise.all(syncTasks);

    res.status(200).json({ 
      success: true, 
      message: `Sync process completed for ${targetRoomIds.length} rooms.` 
    });
  } catch (error) {
    console.error("Selective Sync Error:", error);
    res.status(500).json({ error: "Failed to sync selected rooms" });
  }
};

export { handleLiveblocksAuth, handleSyncMasterToChildren };

