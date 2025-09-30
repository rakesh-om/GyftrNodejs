// controller/settingController.js
const Setting = require("../models/Setting");


// ✅ GET Setting
exports.getSetting = async (req, res) => {
 // console.log('getSetting reached');
  try {
    const { shop } = req.query;
    if (!shop) return res.status(400).json({ error: "Missing shop" });

    const setting = await Setting.findOne({ where: { shop } });
    if (!setting) {
      return res.status(404).json({ message: "No setting found" }); 
    }

    res.json({
      ...setting.toJSON(),
      shopid: setting.shopid ? setting.shopid.toString() : null, // BigInt → string
    });
  } catch (err) {
    console.error("❌ getSetting Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ CREATE Setting (first time)
exports.createSetting = async (req, res) => {
  //console.log("Received payload:", req.body);
  try {
    const {
      shop,
      accessToken,
      shopid,
      brand_name = "",
      mid = "",
      enc_dec_api_key = "",
      enc_dec_api_iv_key = "",
      userId = "",
      hash_salt = "",
      user_name = "",
      password = "",
      reverse_salt = "",
    } = req.body;

    if (!shop || !accessToken || !shopid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if setting already exists
    const existing = await Setting.findOne({ where: { shop } });
    if (existing) {
      return res.status(200).json(existing.toJSON());
    }

    const newSetting = await Setting.create({
      shop,
      accessToken,
      shopid,
      brand_name,
      mid,
      enc_dec_api_key,
      enc_dec_api_iv_key,
      userId,
      hash_salt,
      user_name,
      password,
      reverse_salt,
    });

    res.json({
      ...newSetting.toJSON(),
      shopid: newSetting.shopid ? newSetting.shopid.toString() : null,
    });
  } catch (err) {
    console.error("❌ createSetting Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// ✅ UPDATE Setting
exports.updateSetting = async (req, res) => {
  try {
    const { shop } = req.body;
    if (!shop) return res.status(400).json({ error: "Missing shop" });

    const existing = await Setting.findOne({ where: { shop } });
    if (!existing) {
      return res.status(404).json({ error: "No setting found for update" });
    }

    // Update the record
    await Setting.update(
      { ...req.body },
      { where: { shop } }
    );

    // Fetch updated record
    const updatedSetting = await Setting.findOne({ where: { shop } });

    res.json({
      success: true,
      message: "Settings updated successfully",
      ...updatedSetting.toJSON(),
      shopid: updatedSetting.shopid ? updatedSetting.shopid.toString() : null,
    });
  } catch (err) {
    console.error("❌ updateSetting Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
