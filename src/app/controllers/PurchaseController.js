const Ad = require('../models/Ad')
const Purchase = require('../models/Purchase')
const User = require('../models/User')
const PurchaseMail = require('../jobs/PurchaseMail')
const Queue = require('../services/Queue')

class PurchaseController {
  async index(req, res) {
    const purchases = await Purchase.paginate({}, {
      page: req.params.page || 1,
      limit: 20,
      populate: ['user', 'ad'],
      sort: '-createdAt'
    })

    return res.json(purchases)
  }

  async store(req, res) {
    const {
      ad,
      content
    } = req.body

    const purchaseAd = await Ad.findById(ad).populate('author')
    const user = await User.findById(req.userId)

    if (!purchaseAd) {
      return res.status(404).json({
        message: `Ad not found`
      })
    }

    if (purchaseAd && !purchaseAd.purchasedBy === null) {
      return res.status(400).json({
        message: `Ad ${ ad } already is closed`
      })
    }

    Queue.create(PurchaseMail.key, {
      ad: purchaseAd,
      user,
      content
    }).save()

    const purchase = await Purchase.create({
      ad,
      user: user.id,
      content
    })

    return res.json(purchase)
  }

  async accept(req, res) {
    const {
      id
    } = req.params

    const purchase = await Purchase.findById(id).populate(['ad'])

    if (!purchase) {
      return res.status(400).json({
        message: 'Purchase not found'
      })
    }

    if (purchase.status === 'A') {
      return res.status(400).json({
        message: 'Purchase already accepted'
      })
    }

    const ad = await Ad.findByIdAndUpdate(purchase.ad._id, {
      purchasedBy: req.params.id
    }, {
      new: true
    })

    const acceptedPurchase = await Purchase.findByIdAndUpdate(req.params.id, {
      status: 'A'
    }, {
      new: true
    }).populate(['ad'])

    return res.json(acceptedPurchase)
  }
}

module.exports = new PurchaseController()
